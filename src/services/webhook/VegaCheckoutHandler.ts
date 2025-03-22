import { Request, Response } from "express";
import { User } from "../../models/User";
import { CampaignHistory } from "../../models/CampaignHistory";
import { ScheduledMessage } from "../../models/ScheduledMessage";
import { 
  WebhookHandler, 
  VegaCheckoutPixGeneratedData, 
  VegaCheckoutSaleApprovedData,
  VegaCheckoutRefundData,
  VegaCheckoutChargebackData,
  VegaCheckoutSalePendingData,
  VegaCheckoutSaleRefusedData,
  VegaCheckoutCanceledData,
  VegaCheckoutAbandonedCartData
} from "../../types/webhookHandlers";
import { sendSms } from "../../utils/smsUtils";
import { schedulerService } from "../schedulerService";
import mongoose from "mongoose";
import { shortenURL } from "../../utils/urlUtils";

export class VegaCheckoutHandler implements WebhookHandler {
  async handlePixGenerated(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as VegaCheckoutPixGeneratedData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
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
      const transactionId = data.transaction_id || data.transaction_token;
      const linkPix = `${baseUrl}/?transactionId=${encodeURIComponent(transactionId || "")}`;
      const linkPixShortened = await shortenURL(linkPix);

      // Process messages
      await this.processMessages(
        campaign, 
        data.customer.phone, 
        {
          nome: data.customer.name,
          telefone: data.customer.phone,
          email: data.customer.email || "",
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || "pix",
          qrcode_url: data.qrcode_url || data.pix_code_image64 || "",
          pix_code: data.pix_code || "",
          expires_at: data.billet_due_date || "",
          checkout_url: data.checkout_url || "",
          order_url: data.order_url || "",
          linkPixShortened,
        },
        integration,
        transactionId || ""
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
      const data = req.body as VegaCheckoutSaleApprovedData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
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
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || data.payment_type || "",
          approved_at: data.approved_at || data.updated_at || "",
          order_url: data.order_url || "",
          checkout_url: data.checkout_url || "",
          produtos: this.formatProducts(data),
          linkPixShortened: "",
        },
        integration,
        data.transaction_id || data.transaction_token || ""
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
      const data = req.body as VegaCheckoutRefundData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
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
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || "",
          refunded_at: data.refunded_at || data.updated_at || "",
          order_url: data.order_url || "",
          checkout_url: data.checkout_url || "",
          produtos: this.formatProducts(data),
          linkPixShortened: "",
        },
        integration,
        data.transaction_id || data.transaction_token || ""
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
      const data = req.body as VegaCheckoutChargebackData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
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
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || "",
          chargeback_at: data.updated_at || "",
          order_url: data.order_url || "",
          checkout_url: data.checkout_url || "",
          produtos: this.formatProducts(data),
          linkPixShortened: "",
        },
        integration,
        data.transaction_id || data.transaction_token || ""
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

  async handleSalePending(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as VegaCheckoutSalePendingData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
        res.status(400).send("Campos obrigatórios faltando");
        return;
      }

      const user = await User.findById(integration.createdBy);
      if (!user || user.credits < 1) {
        res.status(400).send("Créditos insuficientes para enviar SMS");
        return;
      }

      // Generate payment link if it's a pix or boleto payment
      let linkShortened = "";
      if (data.method === 'pix' || data.method === 'boleto') {
        const baseUrl = process.env.APP_BASE_URL || "https://sendfy.website/app/sendfy/pix-link-6744b92d0225b9161657fa2b";
        const transactionId = data.transaction_id || data.transaction_token;
        const link = `${baseUrl}/?transactionId=${encodeURIComponent(transactionId || "")}`;
        linkShortened = await shortenURL(link);
      }

      // Process messages
      await this.processMessages(
        campaign, 
        data.customer.phone, 
        {
          nome: data.customer.name,
          telefone: data.customer.phone,
          email: data.customer.email || "",
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || "",
          pix_code: data.pix_code || "",
          billet_url: data.billet_url || "",
          billet_digitable_line: data.billet_digitable_line || "",
          expires_at: data.billet_due_date || "",
          order_url: data.order_url || "",
          checkout_url: data.checkout_url || "",
          produtos: this.formatProducts(data),
          linkPixShortened: linkShortened,
        },
        integration,
        data.transaction_id || data.transaction_token || ""
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento de venda pendente:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  async handleSaleRefused(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as VegaCheckoutSaleRefusedData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
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
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || "",
          refused_at: data.updated_at || "",
          order_url: data.order_url || "",
          checkout_url: data.checkout_url || "",
          produtos: this.formatProducts(data),
          linkPixShortened: "",
        },
        integration,
        data.transaction_id || data.transaction_token || ""
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento de venda recusada:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  async handleSaleCanceled(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as VegaCheckoutCanceledData;
      
      // Validate required fields
      if ((!data.transaction_id && !data.transaction_token) || !data.customer?.name || !data.customer?.phone) {
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
          total_price: typeof data.total_price === 'number' ? data.total_price.toString() : data.total_price,
          payment_type: data.method || "",
          canceled_at: data.updated_at || "",
          order_url: data.order_url || "",
          checkout_url: data.checkout_url || "",
          produtos: this.formatProducts(data),
          linkPixShortened: "",
        },
        integration,
        data.transaction_id || data.transaction_token || ""
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento de venda cancelada:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  async handleAbandonedCart(req: Request, res: Response, integration: any, campaign: any): Promise<void> {
    try {
      const data = req.body as VegaCheckoutAbandonedCartData;
      
      // Validate required fields
      if (!data.checkout_id || !data.customer?.name || !data.customer?.phone) {
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
          total_price: data.total_price,
          abandoned_checkout_url: data.abandoned_checkout_url || "",
          created_at: data.created_at || "",
          produtos: this.formatProductsFromPlans(data.plans),
          linkPixShortened: "",
        },
        integration,
        data.checkout_id
      );

      // Deduct credits from user
      user.credits -= campaign.messages.length;
      await user.save();

      res.status(200).send("Mensagens processadas com sucesso");
    } catch (error) {
      console.error("Erro ao processar evento de carrinho abandonado:", error);
      res.status(500).send("Erro ao processar webhook");
    }
  }

  // Helper method to format product data for message templates
  private formatProducts(data: any): string {
    if (data.products && Array.isArray(data.products)) {
      return data.products.map((product: any) => 
        `${product.title} (${product.quantity}x)`
      ).join(", ");
    } else if (data.plans && Array.isArray(data.plans)) {
      return this.formatProductsFromPlans(data.plans);
    }
    return "";
  }

  // Helper method to format product data from plans array
  private formatProductsFromPlans(plans: any[]): string {
    if (!plans || !Array.isArray(plans)) return "";
    
    const allProducts: string[] = [];
    
    for (const plan of plans) {
      if (plan.products && Array.isArray(plan.products)) {
        const planProducts = plan.products.map((product: any) => 
          `${product.name} (${typeof product.amount === 'number' ? product.amount : 1}x)`
        );
        allProducts.push(...planProducts);
      } else {
        allProducts.push(`${plan.name} (${plan.amount}x)`);
      }
    }
    
    return allProducts.join(", ");
  }

  private async processMessages(
    campaign: any,
    phone: string,
    data: {
      nome: string;
      telefone: string;
      email: string;
      total_price: string;
      payment_type?: string;
      qrcode_url?: string;
      pix_code?: string;
      expires_at?: string;
      approved_at?: string;
      refunded_at?: string;
      chargeback_at?: string;
      refused_at?: string;
      canceled_at?: string;
      billet_url?: string;
      billet_digitable_line?: string;
      order_url?: string;
      checkout_url?: string;
      abandoned_checkout_url?: string;
      created_at?: string;
      produtos?: string;
      linkPixShortened: string;
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
        total_price: string;
        payment_type?: string;
        qrcode_url?: string;
        pix_code?: string;
        expires_at?: string;
        approved_at?: string;
        refunded_at?: string;
        chargeback_at?: string;
        refused_at?: string;
        canceled_at?: string;
        billet_url?: string;
        billet_digitable_line?: string;
        order_url?: string;
        checkout_url?: string;
        abandoned_checkout_url?: string;
        created_at?: string;
        produtos?: string;
        linkPixShortened: string;
      }
    ): string => {
      return messageContent
        .replace(/{{nome}}/g, data.nome)
        .replace(/{{telefone}}/g, data.telefone)
        .replace(/{{email}}/g, data.email)
        .replace(/{{total_price}}/g, data.total_price)
        .replace(/{{payment_type}}/g, data.payment_type || "")
        .replace(/{{qrcode_url}}/g, data.qrcode_url || "")
        .replace(/{{pix_code}}/g, data.pix_code || "")
        .replace(/{{expires_at}}/g, data.expires_at || "")
        .replace(/{{approved_at}}/g, data.approved_at || "")
        .replace(/{{refunded_at}}/g, data.refunded_at || "")
        .replace(/{{chargeback_at}}/g, data.chargeback_at || "")
        .replace(/{{refused_at}}/g, data.refused_at || "")
        .replace(/{{canceled_at}}/g, data.canceled_at || "")
        .replace(/{{billet_url}}/g, data.billet_url || "")
        .replace(/{{billet_digitable_line}}/g, data.billet_digitable_line || "")
        .replace(/{{order_url}}/g, data.order_url || "")
        .replace(/{{checkout_url}}/g, data.checkout_url || "")
        .replace(/{{abandoned_checkout_url}}/g, data.abandoned_checkout_url || "")
        .replace(/{{created_at}}/g, data.created_at || "")
        .replace(/{{produtos}}/g, data.produtos || "")
        .replace(/{{link_pix}}/g, data.linkPixShortened);
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