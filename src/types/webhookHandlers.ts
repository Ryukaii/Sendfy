import { Request, Response } from "express";
import mongoose from "mongoose";

// Base interfaces for all platforms
export interface WebhookHandler {
  handlePixGenerated(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleSaleApproved(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleRefund?(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleChargeback?(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleSalePending?(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleSaleRefused?(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleSaleCanceled?(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
  handleAbandonedCart?(req: Request, res: Response, integration: any, campaign: any): Promise<void>;
}

// Generic event data interface
export interface WebhookEventData {
  transaction_id: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  [key: string]: any; // Allow for additional platform-specific fields
}

// For4Payments common structure
export interface For4PaymentsBaseData {
  paymentId: string;
  externalId: string;
  checkoutUrl: string;
  referrerUrl: string;
  customId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CHARGEBACK' | 'CANCELED';
  paymentMethod: string;
  deliveryStatus: string;
  totalValue: number;
  netValue: number;
  pixQrCode?: string;
  pixCode?: string;
  billetUrl?: string;
  billetCode?: string;
  expiresAt: string;
  dueAt: string;
  installments: number;
  utm: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  customer: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    cep: string;
    phone: string;
    complement: string;
    number: string;
    street: string;
    city: string;
    state: string;
    district: string;
    createdAt: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  refundedAt?: string | null;
  chargebackAt?: string | null;
  rejectedAt?: string | null;
}

// For4Payments specific data structures for each event type
export interface For4PaymentsPixGeneratedData extends For4PaymentsBaseData {
  status: 'PENDING';
}

export interface For4PaymentsSaleApprovedData extends For4PaymentsBaseData {
  status: 'APPROVED';
  approvedAt: string;
}

export interface For4PaymentsRefundData extends For4PaymentsBaseData {
  status: 'REFUNDED';
  refundedAt: string;
}

export interface For4PaymentsChargebackData extends For4PaymentsBaseData {
  status: 'CHARGEBACK';
  chargebackAt: string;
}

// VegaCheckout common structure
export interface VegaCheckoutBaseData {
  transaction_id?: string;
  transaction_token?: string;
  store_name?: string;
  method?: 'pix' | 'boleto' | 'credit_card';
  total_price: string | number;
  status: string;
  order_url?: string;
  checkout_url?: string;
  billet_url?: string;
  billet_digitable_line?: string;
  billet_due_date?: string;
  pix_code?: string;
  pix_code_image64?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  refunded_at?: string;
  checkout?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    src?: string;
  };
  customer: {
    name: string;
    document: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    number: string;
    district: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
    complement?: string;
  };
  plans?: Array<{
    id: string;
    name: string;
    description: string;
    amount: string;
    value: string;
    created_at: string;
    products: Array<{
      id: string;
      name: string;
      description: string;
      amount: number | string;
      photo: string;
      created_at: string;
    }>;
  }>;
  products?: Array<{
    code: string;
    brand?: string | null;
    model?: string | null;
    title: string;
    amount: number;
    version?: string | null;
    quantity: number;
    description?: string | null;
  }>;
}

// VegaCheckout specific data structures for different events
export interface VegaCheckoutPixGeneratedData extends VegaCheckoutBaseData {
  event_name: 'pixGenerated';
  status: 'pending';
  method: 'pix';
  qrcode_url?: string;
  pix_key?: string;
}

export interface VegaCheckoutSaleApprovedData extends VegaCheckoutBaseData {
  event_name: 'saleApproved';
  status: 'approved';
  payment_type?: string;
}

export interface VegaCheckoutSalePendingData extends VegaCheckoutBaseData {
  status: 'pending';
}

export interface VegaCheckoutSaleRefusedData extends VegaCheckoutBaseData {
  status: 'refused';
}

export interface VegaCheckoutChargebackData extends VegaCheckoutBaseData {
  status: 'charge_back';
}

export interface VegaCheckoutRefundData extends VegaCheckoutBaseData {
  status: 'refunded';
}

export interface VegaCheckoutCanceledData extends VegaCheckoutBaseData {
  status: 'canceled';
}

export interface VegaCheckoutAbandonedCartData {
  checkout_id: string;
  store_name: string;
  abandoned_checkout_url: string;
  total_price: string;
  status: 'abandoned_cart';
  checkout: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
  created_at: string;
  customer: {
    name: string;
    document: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    number: string;
    district: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
  };
  plans: Array<{
    id: string;
    name: string;
    description: string;
    amount: string;
    value: string;
    created_at: string;
    products: Array<{
      id: string;
      name: string;
      description: string;
      amount: string;
      photo: string;
      created_at: string;
    }>;
  }>;
}

// Interface for creation of webhook history
export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  processedAt: Date;
  campaignId?: mongoose.Types.ObjectId;
  phone?: string;
  content?: string;
  transactionId?: string;
} 