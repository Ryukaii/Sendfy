import mongoose from "mongoose";

export interface ScheduledMessage {
  campaignId: mongoose.Types.ObjectId;
  phone: string;
  content: string;
  scheduledTime: Date;
  transactionId: string;
  createdBy: mongoose.Types.ObjectId;
}
