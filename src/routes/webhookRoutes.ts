// src/routes/webhookRoutes.ts
import express, { Request, Response, NextFunction } from "express";
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
import { WebhookHandlerFactory } from "../services/webhook/WebhookHandlerFactory";
import { shortenURL } from "../utils/urlUtils";
import { WebhookHistory } from '../models/WebhookHistory';
import { WebhookProcessingResult, WebhookHandler } from '../types/webhookHandlers';
import { PaymentPlatform, eventTypeToHandlerMethod, getEventTypesForPlatform } from '../types/eventTypes';

const router = express.Router();

// Rota para retornar todas as plataformas de pagamento disponíveis
router.get('/platforms', (req: Request, res: Response) => {
  try {
    const platforms: PaymentPlatform[] = ['For4Payments', 'VegaCheckout'];
    res.status(200).json({ platforms });
  } catch (error) {
    console.error('Erro ao retornar plataformas disponíveis:', error);
    res.status(500).json({ error: 'Erro ao retornar plataformas disponíveis' });
  }
});

// Rota para retornar todos os tipos de eventos disponíveis por plataforma
router.get('/event-types', (req: Request, res: Response) => {
  try {
    const platforms: PaymentPlatform[] = ['For4Payments', 'VegaCheckout'];
    const eventTypesByPlatform: Record<PaymentPlatform, string[]> = {} as Record<PaymentPlatform, string[]>;
    
    platforms.forEach(platform => {
      eventTypesByPlatform[platform] = getEventTypesForPlatform(platform);
    });
    
    res.status(200).json({ eventTypes: eventTypesByPlatform });
  } catch (error) {
    console.error('Erro ao retornar tipos de eventos disponíveis:', error);
    res.status(500).json({ error: 'Erro ao retornar tipos de eventos disponíveis' });
  }
});

// Middleware para verificar se o usuário é administrador
const isAdmin = async (req: Request & { user?: { userId: string } }, res: Response, next: Function) => {
  try {
    if (!req.user?.userId) {
      res.status(401).send("Usuário não autorizado");
      return;
    }
    const user = await User.findById(req.user.userId);
    if (!user || user.isAdmin !== true) {
      res.status(401).send("Não autorizado");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send("Erro ao verificar permissões");
  }
};

// Admin verification middleware
const adminVerification = async (req: Request, res: Response, next: NextFunction) => {
  const adminToken = req.header('admin-api-key');
  
  if (!adminToken || adminToken !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Não autorizado' });
    return;
  }
  
  next();
};

// Add credit to a user
router.post('/add-credit', adminVerification, async (req: Request, res: Response) => {
  try {
    const { userId, credits } = req.body;
    if (!userId || !credits) {
       res.status(400).json({ error: 'Id do usuário e créditos são obrigatórios' });
       return
    }
    
    const creditsAmount = parseInt(credits);
    if (isNaN(creditsAmount) || creditsAmount <= 0) {
       res.status(400).json({ error: 'Créditos inválidos' });
       return
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: creditsAmount } },
      { new: true }
    );
    
    if (!updatedUser) {
       res.status(404).json({ error: 'Usuário não encontrado' });
       return
    }
    
    res.status(200).json({ message: 'Créditos adicionados com sucesso', user: updatedUser });
  } catch (error) {
    console.error('Erro ao adicionar créditos:', error);
    res.status(500).json({ error: 'Erro ao adicionar créditos' });
  }
});

// Remove credit from a user
router.post('/remove-credit', adminVerification, async (req: Request, res: Response) => {
  try {
    const { userId, credits } = req.body;
    if (!userId || !credits) {
       res.status(400).json({ error: 'Id do usuário e créditos são obrigatórios' });
       return
    }
    
    const creditsAmount = parseInt(credits);
    if (isNaN(creditsAmount) || creditsAmount <= 0) {
       res.status(400).json({ error: 'Créditos inválidos' });
       return
    }
    
    const user = await User.findById(userId);
    if (!user) {
       res.status(404).json({ error: 'Usuário não encontrado' });
       return
    }
    
    if (user.credits < creditsAmount) {
       res.status(400).json({ error: 'Usuário não possui créditos suficientes' });
       return
    }
    
    user.credits -= creditsAmount;
    await user.save();
    
    res.status(200).json({ message: 'Créditos removidos com sucesso', user });
  } catch (error) {
    console.error('Erro ao remover créditos:', error);
    res.status(500).json({ error: 'Erro ao remover créditos' });
  }
});

// Helper function to determine the event type for VegaCheckout
function determineVegaCheckoutEventType(data: any): string | null {
  // First check if there's a status field
  if (data.status) {
    // Check for abandoned cart first
    if (data.status === 'abandoned_cart') {
      return 'Carrinho abandonado';
    }
    
    // Check for transaction status
    switch (data.status) {
      case 'approved':
        return 'Venda aprovada';
      case 'pending':
        return 'Venda aguardando pagamento';
      case 'refused':
        return 'Venda recusada';
      case 'charge_back':
        return 'Venda chargeback';
      case 'refunded':
        return 'Venda estornada';
      case 'canceled':
        return 'Venda cancelada';
      default:
        return null;
    }
  }
  
  // If no status field, try to determine by the payload structure
  if (data.abandoned_checkout_url) {
    return 'Carrinho abandonado';
  }
  
  // Fallback for old format where event_name is used
  if (data.event_name) {
    if (data.event_name === 'pixGenerated') {
      return 'Pix Gerado';
    } else if (data.event_name === 'saleApproved') {
      return 'Venda aprovada';
    }
  }
  
  return null;
}

// Webhook endpoint
router.post('/:integrationId/:campaignId', async (req: Request, res: Response) => {
  const { integrationId, campaignId } = req.params;
  let webhookResult: WebhookProcessingResult | null = null;
  
  try {
    // Log the webhook request
    console.log(`Webhook received for integration ${integrationId} and campaign ${campaignId}`);
    
    // Find the integration and campaign
    const integration = await Integration.findById(integrationId);
    if (!integration) {
      throw new Error('Integração não encontrada');
    }
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }
    
    // Get the webhook handler
    const paymentPlatform = campaign.paymentPlatform as PaymentPlatform;
    const webhookHandler = WebhookHandlerFactory.getHandler(paymentPlatform);
    
    if (!webhookHandler) {
      throw new Error(`Handler não encontrado para a plataforma ${paymentPlatform}`);
    }
    
    // Determine the event type based on the platform and request body
    let eventType: string | null = null;
    
    if (paymentPlatform === 'For4Payments') {
      // For4Payments determines event type by the status field
      const status = req.body?.status;
      if (status === 'PENDING') {
        eventType = 'Pix Gerado';
      } else if (status === 'APPROVED') {
        eventType = 'Compra aprovada';
      } else if (status === 'REFUNDED') {
        eventType = 'Reembolso';
      } else if (status === 'CHARGEBACK') {
        eventType = 'Chargeback';
      }
    } else if (paymentPlatform === 'VegaCheckout') {
      // VegaCheckout has different structure for determining event type
      eventType = determineVegaCheckoutEventType(req.body);
    }
    
    if (!eventType) {
      throw new Error('Tipo de evento não identificado');
    }
    
    // Check if the campaign is configured for this event type
    if (campaign.tipoEvento !== eventType) {
      throw new Error(`Campanha não está configurada para o evento ${eventType}`);
    }
    
    // Get the handler method for this event type
    const handlerMethod = eventTypeToHandlerMethod[eventType];
    if (!handlerMethod || typeof (webhookHandler as any)[handlerMethod] !== 'function') {
      throw new Error(`Método de handler ${handlerMethod} não encontrado para o evento ${eventType}`);
    }
    
    // Execute the handler
    await (webhookHandler as any)[handlerMethod](req, res, integration, campaign);
    
    // If we get here, it means the handler responded directly
    // We'll still log the success
    console.log(`Webhook for ${eventType} processed successfully`);
    
    // Record webhook history
    try {
      await WebhookHistory.create({
        integrationId: integration._id,
        campaignId: campaign._id,
        eventType,
        payload: req.body,
        status: 'success',
        message: 'Webhook processado com sucesso',
        processedAt: new Date()
      });
    } catch (historyError) {
      console.error('Error recording webhook history:', historyError);
    }
    
    // If the handler hasn't sent a response yet, we'll do it here
    if (!res.headersSent) {
      res.status(200).json({ message: 'Webhook processado com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    // Record webhook history for error
    try {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await WebhookHistory.create({
        integrationId,
        campaignId,
        eventType: 'unknown',
        payload: req.body,
        status: 'error',
        message: errorMessage,
        processedAt: new Date()
      });
    } catch (historyError) {
      console.error('Error recording webhook history:', historyError);
    }
    
    // Send an error response if one hasn't been sent already
    if (!res.headersSent) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(500).json({ error: errorMessage });
    }
  }
});

// Legacy webhook handler (kept for backward compatibility)
router.post("/webhook/:webhookId", async (req: Request, res: Response) => {
  try {
    const webhookId = req.params.webhookId;
    
    // Find the integration by webhook ID
    const integration = await Integration.findOne({
      webhookUrl: `/webhook/${webhookId}`,
    });

    if (!integration) {
      res.status(404).send("Integração não encontrada");
      return;
    }

    // Find active campaign for this integration
    const activeCampaign = await Campaign.findOne({
      integrationName: integration.name,
      createdBy: integration.createdBy,
      status: "active",
    });

    if (!activeCampaign) {
      res.status(404).send("Nenhuma campanha ativa encontrada");
      return;
    }

    // Determine the event type based on the platform and request body
    let eventType: string | null = null;
    
    if (activeCampaign.paymentPlatform === 'For4Payments') {
      // For4Payments determines event type by the status field
      const status = req.body?.status;
      if (status === 'PENDING') {
        eventType = 'Pix Gerado';
      } else if (status === 'APPROVED') {
        eventType = 'Compra aprovada';
      } else if (status === 'REFUNDED') {
        eventType = 'Reembolso';
      } else if (status === 'CHARGEBACK') {
        eventType = 'Chargeback';
      }
    } else if (activeCampaign.paymentPlatform === 'VegaCheckout') {
      // VegaCheckout has different structure for determining event type
      eventType = determineVegaCheckoutEventType(req.body);
    }
    
    if (!eventType) {
      res.status(400).send("Tipo de evento não identificado");
      return;
    }
    
    // Check if the campaign is configured for this event type
    if (activeCampaign.tipoEvento !== eventType) {
      res.status(400).send(`Campanha não está configurada para o evento ${eventType}`);
      return;
    }
    
    // Get the handler
    const handler = WebhookHandlerFactory.getHandler(activeCampaign.paymentPlatform);
    
    // Get the handler method for this event type
    const handlerMethod = eventTypeToHandlerMethod[eventType];
    if (!handlerMethod || typeof (handler as any)[handlerMethod] !== 'function') {
      res.status(400).send(`Método de handler ${handlerMethod} não encontrado para o evento ${eventType}`);
      return;
    }
    
    // Execute the handler
    await (handler as any)[handlerMethod](req, res, integration, activeCampaign);
    
    // Record webhook history
    try {
      await WebhookHistory.create({
        integrationId: integration._id,
        campaignId: activeCampaign._id,
        eventType,
        payload: req.body,
        status: 'success',
        message: 'Webhook processado com sucesso',
        processedAt: new Date()
      });
    } catch (historyError) {
      console.error('Error recording webhook history:', historyError);
    }
    
    // If the handler hasn't sent a response yet, we'll do it here
    if (!res.headersSent) {
      res.status(200).json({ message: 'Webhook processado com sucesso' });
    }
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    if (!res.headersSent) {
      res.status(500).send("Erro ao processar webhook");
    }
  }
});

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
    userId: createdBy,
  });

  const plainScheduledMessage: IScheduledMessage = {
    ...scheduledMessage.toObject(),
    createdBy: scheduledMessage.createdBy ?? new mongoose.Types.ObjectId(),
  };

  await schedulerService.scheduleMessage(plainScheduledMessage);
}

export default router;
