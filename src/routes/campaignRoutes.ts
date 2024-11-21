import express, { Request, Response, NextFunction } from "express";
import { Campaign } from "../models/Campaign";
import { Integration } from "../models/Integration";
import { sendSms } from "../utils/smsUtils";
import { CampaignHistory } from "../models/CampaignHistory";

const router = express.Router();

router.post(
  "/webhook/:webhookId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nome, telefone, email } = req.body;
      const { webhookId } = req.params;

      // Verificar a integração
      const integration = await Integration.findOne({
        webhookUrl: `/webhook/${webhookId}`,
      });
      if (!integration) {
        res.status(404).json({ error: "Integração não encontrada" });
        return;
      }

      // Verificar a campanha ativa
      const activeCampaign = await Campaign.findOne({
        integrationName: integration.name,
        createdBy: integration.createdBy,
        status: "active",
      });
      if (!activeCampaign) {
        res
          .status(404)
          .json({
            error: "Nenhuma campanha ativa encontrada para a integração",
          });
        return;
      }

      // Substituir variáveis na mensagem template
      let messageContent = activeCampaign.messageTemplate;
      messageContent = messageContent
        .replace("{{nome}}", nome)
        .replace("{{telefone}}", telefone)
        .replace("{{email}}", email);

      // Enviar SMS
      await sendSms(telefone, messageContent);

      // Salvar histórico da campanha
      const campaignHistoryEntry = new CampaignHistory({
        campaignId: activeCampaign._id,
        responseStatus: "sent",
        messageContent,
      });
      await campaignHistoryEntry.save();

      res.status(200).json({ message: "SMS enviado com sucesso" });
    } catch (error) {
      next(error); // Encaminhar erros para o middleware de erros
    }
  },
);

export default router;
