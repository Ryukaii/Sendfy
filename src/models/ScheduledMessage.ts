import mongoose from "mongoose";

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
    reqired: true,
  },
  transactionId: { type: String, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export const ScheduledMessage = mongoose.model(
  "ScheduledMessage",
  scheduledMessageSchema,
);
