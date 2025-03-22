import mongoose, { Schema } from "mongoose";
import { platformEventTypes, isValidEventTypeForPlatform, PaymentPlatform } from "../types/eventTypes";

// Define schema for the message structure
const MessageSchema = new Schema({
  messageTemplate: {
    type: String,
    required: true,
  },
  delay: {
    time: {
      type: Number,
      default: 0,
    },
    counter: {
      type: String,
      enum: ["minutes", "hours", "days"],
      default: "minutes",
    },
  },
});

// Interface for the campaign document
interface ICampaignDocument extends mongoose.Document {
  name: string;
  integrationName: string;
  paymentPlatform: PaymentPlatform;
  tipoEvento: string;
  status: "active" | "paused" | "completed";
  messages: Array<{
    messageTemplate: string;
    delay: {
      time: number;
      counter: "minutes" | "hours" | "days";
    };
  }>;
  createdBy: mongoose.Types.ObjectId;
}

// Define the Campaign schema
const CampaignSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    integrationName: {
      type: String,
      required: true,
    },
    paymentPlatform: {
      type: String,
      enum: ["For4Payments", "VegaCheckout"],
      required: true,
    },
    tipoEvento: {
      type: String,
      required: true,
      validate: {
        validator: function(this: ICampaignDocument, value: string): boolean {
          // Get the payment platform from the document
          const platform = this.paymentPlatform;
          return isValidEventTypeForPlatform(value, platform);
        },
        message: (props: { value: string }) => {
          const doc = this as unknown as ICampaignDocument;
          return `${props.value} não é um tipo de evento válido para a plataforma ${doc.paymentPlatform}. Eventos válidos: ${platformEventTypes[doc.paymentPlatform]?.join(', ')}`;
        }
      }
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    messages: [MessageSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Create the Campaign model
export const Campaign = mongoose.model<ICampaignDocument>("Campaign", CampaignSchema);
