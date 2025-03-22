import mongoose, { Schema } from "mongoose";

// Interface for the webhook history document
interface IWebhookHistoryDocument extends mongoose.Document {
  integrationId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  eventType: string;
  payload: any;
  status: 'success' | 'error';
  message: string;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the WebhookHistory schema
const WebhookHistorySchema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "error"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    processedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Create the WebhookHistory model
export const WebhookHistory = mongoose.model<IWebhookHistoryDocument>(
  "WebhookHistory",
  WebhookHistorySchema
); 