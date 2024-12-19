import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  messageTemplate: { type: String, required: true },
  delay: {
    time: { type: Number, required: true },
    counter: { type: String, required: true },
  },
});

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  integrationName: { type: String, required: true },
  tipoEvento: { type: String, required: true },
  messages: [messageSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "pending" },
});

export const Campaign = mongoose.model("Campaign", campaignSchema);
