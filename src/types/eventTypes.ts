// src/types/eventTypes.ts

// Types of events supported by For4Payments
export type For4PaymentsEventType = 
  | 'Pix Gerado' 
  | 'Compra aprovada' 
  | 'Reembolso' 
  | 'Chargeback';

// Types of events supported by VegaCheckout
export type VegaCheckoutEventType = 
  | 'Pix Gerado' 
  | 'Venda aprovada' 
  | 'Venda aguardando pagamento' 
  | 'Venda recusada'
  | 'Venda chargeback'
  | 'Venda estornada'
  | 'Venda cancelada'
  | 'Carrinho abandonado';

// Union type of all event types
export type EventType = For4PaymentsEventType | VegaCheckoutEventType;

// Payment platform types
export type PaymentPlatform = 'For4Payments' | 'VegaCheckout';

// Create a mapping of payment platforms to their event types
export const platformEventTypes: Record<PaymentPlatform, string[]> = {
  'For4Payments': [
    'Pix Gerado',
    'Compra aprovada',
    'Reembolso',
    'Chargeback'
  ],
  'VegaCheckout': [
    'Pix Gerado',
    'Venda aprovada',
    'Venda aguardando pagamento',
    'Venda recusada',
    'Venda chargeback',
    'Venda estornada',
    'Venda cancelada',
    'Carrinho abandonado'
  ]
};

// Function to check if an event type is valid for a platform
export function isValidEventTypeForPlatform(
  eventType: string,
  platform: PaymentPlatform
): boolean {
  return platformEventTypes[platform]?.includes(eventType) || false;
}

// Map event types to their webhook handler methods
export const eventTypeToHandlerMethod: Record<string, string> = {
  // For4Payments
  'Pix Gerado': 'handlePixGenerated',
  'Compra aprovada': 'handleSaleApproved',
  'Reembolso': 'handleRefund',
  'Chargeback': 'handleChargeback',
  
  // VegaCheckout
  'Venda aprovada': 'handleSaleApproved',
  'Venda aguardando pagamento': 'handleSalePending',
  'Venda recusada': 'handleSaleRefused',
  'Venda chargeback': 'handleChargeback',
  'Venda estornada': 'handleRefund',
  'Venda cancelada': 'handleSaleCanceled',
  'Carrinho abandonado': 'handleAbandonedCart'
};

// Get event types for a given platform
export function getEventTypesForPlatform(platform: PaymentPlatform): string[] {
  return platformEventTypes[platform];
} 