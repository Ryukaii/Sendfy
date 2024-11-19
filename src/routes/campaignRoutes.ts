// src/routes/webhookRoutes.ts
import express, { Request, Response } from "express";
import axios from "axios";
import { Campaign } from "../models/Campaign";
import { CampaignHistory } from "../models/CampaignHistory";
import { Integration } from "../models/Integration";

const router = express.Router();

// Receber dados do webhook e enviar SMS
router.post(
  "/webhook/:webhookId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { nome, telefone, email } = req.body;
      const webhookId = req.params.webhookId;

      const integration = await Integration.findOne({
        webhookUrl: `/webhook/${webhookId}`,
      });
      if (!integration) {
        res.status(404).send("Integração não encontrada");
        return;
      }

      const activeCampaign = await Campaign.findOne({
        integrationName: integration.name,
        createdBy: integration.createdBy,
        status: "active",
      });
      if (!activeCampaign) {
        res.status(404).send("Nenhuma campanha ativa encontrada");
        return;
      }

      // Substituir variáveis na mensagem template
      let messageContent = activeCampaign.messageTemplate;
      messageContent = messageContent
        .replace("{{nome}}", nome)
        .replace("{{telefone}}", telefone)
        .replace("{{email}}", email);

      // Enviar SMS através da API
      const smsApiUrl = "https://api.smsdev.com.br/v1/send";
      const smsApiKey = process.env.SMS_API_KEY;
      if (!smsApiKey) {
        res.status(500).send("Chave da API de SMS não configurada");
        return;
      }

      const response = await axios.post(smsApiUrl, {
        key: smsApiKey,
        type: 9,
        number: telefone,
        msg: messageContent,
      });

      const responseStatus = "active";

      // Salvar histórico da campanha
      const campaignHistoryEntry = new CampaignHistory({
        campaignId: activeCampaign._id,
        responseStatus,
        messageContent,
      });
      await campaignHistoryEntry.save();

      res.status(200).send("SMS enviado com sucesso");
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  },
);

export default router;
