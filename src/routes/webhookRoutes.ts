// src/routes/webhookRoutes.ts
import express, { Request, Response } from "express";
import axios from "axios";
import { Campaign } from "../models/Campaign";
import { CampaignHistory } from "../models/CampaignHistory";
import { Integration } from "../models/Integration";
import { User } from "../models/User";

const router = express.Router();

// Middleware para verificar se o usuário é administrador
const isAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user?.userId) {
      res.status(401).send("Usuário não autorizado");
      return;
    }
    const user = await User.findById(req.user.userId);
    if (!user || user.isAdmin !== true) {
      res.status(403).send("Acesso negado");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send("Erro ao verificar permissões de administrador");
  }
};

// Adicionar créditos ao usuário (somente admin)
router.post(
  "/admin/add-credits",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, credits } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).send("Usuário não encontrado");
        return;
      }
      user.credits += credits;
      await user.save();
      res
        .status(200)
        .send(
          `Créditos adicionados com sucesso. Créditos atuais: ${user.credits}`,
        );
    } catch (error) {
      res.status(500).send("Erro ao adicionar créditos");
    }
  },
);

// Remover créditos do usuário (somente admin)
router.post(
  "/admin/remove-credits",
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, credits } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).send("Usuário não encontrado");
        return;
      }
      if (user.credits < credits) {
        res.status(400).send("Créditos insuficientes");
        return;
      }
      user.credits -= credits;
      await user.save();
      res
        .status(200)
        .send(
          `Créditos removidos com sucesso. Créditos atuais: ${user.credits}`,
        );
    } catch (error) {
      res.status(500).send("Erro ao remover créditos");
    }
  },
);

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

      // Verificar se o usuário tem créditos suficientes
      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
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

      // Se o envio do SMS for bem-sucedido, descontar 1 crédito do usuário
      user.credits -= 1;
      await user.save();

      const responseStatus = "success";

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
