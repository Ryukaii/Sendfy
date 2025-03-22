import { Request, Response } from "express";
import { User } from "../../models/User";
import { CampaignHistory } from "../../models/CampaignHistory";
import { ScheduledMessage } from "../../models/ScheduledMessage";
import { 
  WebhookHandler, 
  For4PaymentsPixGeneratedData, 
  For4PaymentsSaleApprovedData,
  For4PaymentsRefundData,
  For4PaymentsChargebackData
} from "../../types/webhookHandlers";
import { sendSms } from "../../utils/smsUtils";
import { schedulerService } from "../schedulerService";
import mongoose from "mongoose";
import { shortenURL } from "../../utils/urlUtils";

export class For4PaymentsHandler implements WebhookHandler {
  async handlePixGenerated(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as For4PaymentsPixGeneratedData;
      
      // Validate required fields
      if (!data.paymentId || !data.customer?.name || !data.customer?.phone) {
        res.status(400).send("Campos obrigatórios faltando");
        return;
      }

      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
        return;
      }

      // Generate and shorten Pix payment link
      const baseUrl = process.env.APP_BASE_URL || "https://sendfy.website/app/sendfy/pix-link-6744b92d0225b9161657fa2b";
      const linkPix = `${baseUrl}/?transactionId=${encodeURIComponent(data.paymentId)}`;
      const linkPixShortened = await shortenURL(linkPix);

      // Process messages
      await this.processMessages(
        campaign, 
        data.customer.phone, 
        {
          nome: data.customer.name,
          telefone: data.customer.phone,
          email: data.customer.email || "",
          total_price: data.totalValue.toString(),
          payment_method: data.paymentMethod,
          cpf: data.customer.cpf,
          linkPixShortened,
          pix_code: data.pixCode || "",
          pix_qrcode: data.pixQrCode || "",
          expires_at: data.expiresAt,
        },
        integration,
        data.paymentId
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento Pix gerado:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  async handleSaleApproved(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as For4PaymentsSaleApprovedData;
      
      // Validate required fields
      if (!data.paymentId || !data.customer?.name || !data.customer?.phone) {
        res.status(400).send("Campos obrigatórios faltando");
        return;
      }

      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
        return;
      }

      // Process messages
      await this.processMessages(
        campaign, 
        data.customer.phone, 
        {
          nome: data.customer.name,
          telefone: data.customer.phone,
          email: data.customer.email || "",
          total_price: data.totalValue.toString(),
          payment_method: data.paymentMethod,
          cpf: data.customer.cpf,
          approved_at: data.approvedAt || "",
          linkPixShortened: "", // Not needed for approved sales
          produtos: data.items.map(item => `${item.name} (${item.quantity}x)`).join(", ")
        },
        integration,
        data.paymentId
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento venda aprovada:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  async handleRefund(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as For4PaymentsRefundData;
      
      // Validate required fields
      if (!data.paymentId || !data.customer?.name || !data.customer?.phone) {
        res.status(400).send("Campos obrigatórios faltando");
        return;
      }

      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
        return;
      }

      // Process messages
      await this.processMessages(
        campaign, 
        data.customer.phone, 
        {
          nome: data.customer.name,
          telefone: data.customer.phone,
          email: data.customer.email || "",
          total_price: data.totalValue.toString(),
          payment_method: data.paymentMethod,
          cpf: data.customer.cpf,
          refunded_at: data.refundedAt || "",
          linkPixShortened: "",
          produtos: data.items.map(item => `${item.name} (${item.quantity}x)`).join(", ")
        },
        integration,
        data.paymentId
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento de reembolso:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  async handleChargeback(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as For4PaymentsChargebackData;
      
      // Validate required fields
      if (!data.paymentId || !data.customer?.name || !data.customer?.phone) {
        res.status(400).send("Campos obrigatórios faltando");
        return;
      }

      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
        return;
      }

      // Process messages
      await this.processMessages(
        campaign, 
        data.customer.phone, 
        {
          nome: data.customer.name,
          telefone: data.customer.phone,
          email: data.customer.email || "",
          total_price: data.totalValue.toString(),
          payment_method: data.paymentMethod,
          cpf: data.customer.cpf,
          chargeback_at: data.chargebackAt || "",
          linkPixShortened: "",
          produtos: data.items.map(item => `${item.name} (${item.quantity}x)`).join(", ")
        },
        integration,
        data.paymentId
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento de chargeback:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  private async processMessages(
    campaign: any,
    phone: string,
    data: {
      nome: string;
      telefone: string;
      email: string;
      cpf: string;
      total_price?: string;
      payment_method?: string;
      linkPixShortened: string;
      approved_at?: string;
      refunded_at?: string;
      chargeback_at?: string;
      produtos?: string;
      pix_code?: string;
      pix_qrcode?: string;
      expires_at?: string;
    },
    integration: any,
    transactionId: string
  ): Promise<void> {
    // Function to replace placeholders in message templates
    const replaceMessagePlaceholders = (
      messageContent: string,
      data: {
        nome: string;
        telefone: string;
        email: string;
        cpf: string;
        total_price?: string;
        payment_method?: string;
        linkPixShortened: string;
        approved_at?: string;
        refunded_at?: string;
        chargeback_at?: string;
        produtos?: string;
        pix_code?: string;
        pix_qrcode?: string;
        expires_at?: string;
      }
    ): string => {
      return messageContent
        .replace(/{{nome}}/g, data.nome)
        .replace(/{{telefone}}/g, data.telefone)
        .replace(/{{email}}/g, data.email)
        .replace(/{{cpf}}/g, data.cpf)
        .replace(/{{total_price}}/g, data.total_price || "")
        .replace(/{{payment_method}}/g, data.payment_method || "")
        .replace(/{{link_pix}}/g, data.linkPixShortened)
        .replace(/{{approved_at}}/g, data.approved_at || "")
        .replace(/{{refunded_at}}/g, data.refunded_at || "")
        .replace(/{{chargeback_at}}/g, data.chargeback_at || "")
        .replace(/{{produtos}}/g, data.produtos || "")
        .replace(/{{pix_code}}/g, data.pix_code || "")
        .replace(/{{pix_qrcode}}/g, data.pix_qrcode || "")
        .replace(/{{expires_at}}/g, data.expires_at || "");
    };

    // Function to get milliseconds from counter type
    const getMilliseconds = (counter: string): number => {
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
    };

    // Process each message in the campaign
    for (const message of campaign.messages) {
      const processedContent = replaceMessagePlaceholders(
        message.messageTemplate,
        data
      );

      const delay = message.delay?.time ?? 0;
      const scheduledTime = new Date(
        Date.now() + delay * getMilliseconds(message.delay?.counter ?? "minutes")
      );

      if (delay === 0) {
        // Send SMS immediately
        await sendSms(phone, processedContent);
        await User.findByIdAndUpdate(integration.createdBy, { $inc: { totalSmsSent: 1 } });
        await this.createCampaignHistory(
          campaign._id,
          processedContent,
          phone,
          integration._id,
          integration.createdBy
        );
      } else {
        // Schedule message for later
        await this.scheduleMessage(
          {
            content: processedContent,
            scheduledTime
          },
          phone,
          campaign._id,
          integration.createdBy,
          transactionId
        );
      }
    }
  }

  private async createCampaignHistory(
    campaignId: mongoose.Types.ObjectId,
    message: string,
    recipient: string,
    integrationId: mongoose.Types.ObjectId,
    createdBy: mongoose.Types.ObjectId
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

  private async scheduleMessage(
    message: { content: string; scheduledTime: Date },
    phone: string,
    campaignId: mongoose.Types.ObjectId,
    createdBy: mongoose.Types.ObjectId,
    transactionId: string
  ): Promise<void> {
    const scheduledMessage = await ScheduledMessage.create({
      campaignId,
      phone,
      content: message.content,
      scheduledTime: message.scheduledTime,
      transactionId,
      createdBy,
      userId: createdBy,
    });

    const plainScheduledMessage = {
      ...scheduledMessage.toObject(),
      createdBy: scheduledMessage.createdBy ?? new mongoose.Types.ObjectId(),
    };

    await schedulerService.scheduleMessage(plainScheduledMessage);
  }
} 