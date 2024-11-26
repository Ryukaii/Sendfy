import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  cpf: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  pixCode: { type: String, required: true },
  qrCodeImage: { type: String, required: true }, // Base64 ou URL da imagem
  createdAt: { type: Date, default: Date.now },
});

export const Payment = mongoose.model("Payment", PaymentSchema);
