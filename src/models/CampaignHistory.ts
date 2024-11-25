import mongoose from "mongoose";

const campaignHistorySchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Certifique-se disso
  executedAt: { type: Date, default: Date.now },
  responseStatus: String,
  messageContent: String,
  phone: String,
  type: String,
});

export const CampaignHistory = mongoose.model(
  "CampaignHistory",
  campaignHistorySchema,
);
