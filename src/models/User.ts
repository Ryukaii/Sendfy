// src/models/User.ts
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
  role: { type: String, enum: ["user", "admin"], default: "user" }, // Adicione este campo
});

export const User = mongoose.model("User", userSchema);
