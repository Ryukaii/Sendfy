// src/models/Campaign.ts
import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  integrationName: { type: String, required: true },
  messageTemplate: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "pending" },
});

export const Campaign = mongoose.model("Campaign", campaignSchema);
