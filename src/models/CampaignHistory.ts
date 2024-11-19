import mongoose from "mongoose";

const campaignHistorySchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  executedAt: { type: Date, default: Date.now },
  responseStatus: String,
  messageContent: String,
});

export const CampaignHistory = mongoose.model(
  "CampaignHistory",
  campaignHistorySchema,
);
