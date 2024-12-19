import mongoose from "mongoose";
export interface IScheduledMessage {
  campaignId: mongoose.Types.ObjectId;
  phone: string;
  content: string;
  scheduledTime: Date;
  transactionId: string;
  createdBy: mongoose.Types.ObjectId;
}

interface ScheduledMessage {
  campaignId: mongoose.Types.ObjectId;
  phone: string;
  content: string;
  scheduledTime: Date;
  transactionId: string;
  createdBy: mongoose.Types.ObjectId;
}

const scheduledMessageSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
  },
  phone: { type: String, required: true },
  content: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transactionId: { type: String, required: true },
});

export const ScheduledMessage = mongoose.model<ScheduledMessage>(
  "ScheduledMessage",
  scheduledMessageSchema,
);
