// src/models/Integration.ts
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const integrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  webhookUrl: {
    type: String,
    required: true,
    default: () => `/webhook/${uuidv4()}`,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

export const Integration = mongoose.model("Integration", integrationSchema);
