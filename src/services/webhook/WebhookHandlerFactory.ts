import { WebhookHandler } from "../../types/webhookHandlers";
import { For4PaymentsHandler } from "./For4PaymentsHandler";
import { VegaCheckoutHandler } from "./VegaCheckoutHandler";

export class WebhookHandlerFactory {
  static getHandler(platform: string): WebhookHandler {
    switch (platform) {
      case "For4Payments":
        return new For4PaymentsHandler();
      case "VegaCheckout":
        return new VegaCheckoutHandler();
      default:
        throw new Error(`Payment platform '${platform}' not supported`);
    }
  }
} 