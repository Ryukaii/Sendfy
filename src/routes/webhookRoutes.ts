// src/routes/webhookRoutes.ts
import express, { Request, Response } from "express";
import axios from "axios";
import { Campaign } from "../models/Campaign";
import { CampaignHistory } from "../models/CampaignHistory";
import { Integration } from "../models/Integration";
import { User } from "../models/User";
import { ScheduledMessage } from "../models/ScheduledMessage";
import { sendSms } from "../utils/smsUtils";
import { Vega } from "../models/Vega";
import { schedulerService } from "../services/schedulerService";
import { IScheduledMessage } from "../types/scheduledMessage";
import mongoose from "mongoose";

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
const shortenURL = async (url: string): Promise<string> => {
  try {
    // Certifique-se de que a URL seja válida antes de enviar
    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(url)) {
      throw new Error("URL inválida fornecida para encurtar");
    }

    const response = await axios.post(
      "https://api.encurtador.dev/encurtamentos",
      { url }, // Envia a URL diretamente como um objeto JSON
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Resposta da API de encurtamento:", response.data);
    return response.data.urlEncurtada; // Ajuste baseado no retorno da API
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Erro na requisição:",
        error.response?.data || error.message,
      );
    } else {
      console.error("Erro desconhecido:", (error as Error).message);
    }
    throw new Error("Falha ao encurtar o link");
  }
};

router.post(
  "/webhook/:webhookId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { transaction_id, customer } = req.body;

      if (!customer?.name || !customer?.phone) {
        res.status(400).send("Campos obrigatórios faltando: name ou phone");
        return;
      }

      const nome = customer.name;
      const telefone = customer.phone;
      const email = customer.email || "";
      const webhookId = req.params.webhookId;

      // Base URL para o link Pix
      const baseUrl =
        process.env.APP_BASE_URL ||
        "https://sendfy.website/app/sendfy/pix-link-6744b92d0225b9161657fa2b";
      const linkPix = `${baseUrl}/?transactionId=${encodeURIComponent(transaction_id)}`;

      // Certifique-se de que o linkPix seja válido antes de encurtar
      console.log("Gerando URL para encurtar:", linkPix);
      const linkPixShortened = await shortenURL(linkPix);

      // Resto do código permanece o mesmo
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

      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
        return;
      }

      // Assumindo que activeCampaign.messages é um array de objetos de mensagem

      // Função para substituir placeholders em uma única mensagem
      function replaceMessagePlaceholders(
        messageContent: string,
        data: {
          nome: string;
          telefone: string;
          email: string;
          total_price?: string;
          linkPixShortened: string;
        },
      ): string {
        return messageContent
          .replace("{{nome}}", data.nome)
          .replace("{{telefone}}", data.telefone)
          .replace("{{email}}", data.email)
          .replace("{{total_price}}", data.total_price || "")
          .replace("{{link_pix}}", data.linkPixShortened);
      }

      function getMilliseconds(counter: string): number {
        switch (counter) {
          case "minutes":
            return 60 * 1000;
          case "hours":
            return 60 * 60 * 1000;
          case "days":
            return 24 * 60 * 60 * 1000;
          default:
            return 0;
        }
      }

      // Iterando sobre todas as mensagens da campanha
      const processedMessages = activeCampaign.messages.map((message) => {
        const processedContent = replaceMessagePlaceholders(
          message.messageTemplate,
          {
            nome,
            telefone,
            email,
            total_price: req.body.total_price,
            linkPixShortened,
          },
        );

        const delay = message.delay?.time ?? 0;
        const scheduledTime = new Date(
          Date.now() +
            delay * getMilliseconds(message.delay?.counter ?? "minutes"),
        );

        return {
          content: processedContent,
          scheduledTime,
          delay,
        };
      });

      for (const message of processedMessages) {
        console.log(message);
        if (message.delay === 0) {
          // Enviar SMS imediatamente
          console.log("Mensagem com delay 0: Enviando sms imediatamente");
          await sendSms(telefone, message.content);
          await createCampaignHistory(
            activeCampaign._id,
            message.content,
            telefone,
            integration._id,
            // createdBy é obrigatório, então o valor padrão é uma string vazia
            integration.createdBy ?? new mongoose.Types.ObjectId(),
          );
        } else {
          // Agendar mensagem para envio posterior
          await scheduleMessage(
            message,
            telefone,
            activeCampaign._id,
            integration.createdBy ?? new mongoose.Types.ObjectId(),
            transaction_id,
          );
        }
      }

      user.credits -= processedMessages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  },
);

async function createCampaignHistory(
  campaignId: mongoose.Types.ObjectId,
  message: string,
  recipient: string,
  integrationId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
): Promise<void> {
  const campaignHistory = new CampaignHistory({
    campaignId,
    message,
    executedAt: new Date(),
    recipient,
    integrationId,
    createdBy,
  });
  await campaignHistory.save();
}

async function scheduleMessage(
  message: { content: string; scheduledTime: Date },
  phone: string,
  campaignId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
  transactionId: string,
): Promise<void> {
  const scheduledMessage = await ScheduledMessage.create({
    campaignId,
    phone,
    content: message.content,
    scheduledTime: message.scheduledTime,
    transactionId,
    createdBy,
  });

  const plainScheduledMessage: IScheduledMessage = {
    ...scheduledMessage.toObject(),
    createdBy: scheduledMessage.createdBy ?? new mongoose.Types.ObjectId(),
  };

  await schedulerService.scheduleMessage(plainScheduledMessage);
}

export default router;
