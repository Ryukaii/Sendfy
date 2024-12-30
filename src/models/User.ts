import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcrypt";
const crypto = require("crypto");


export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  surname: string;
  password: string;
  email: string;
  isAdmin: boolean;
  isVerified: boolean;
  credits: number;
  verificationToken: string;
  expiresat: Date;
  createdAt: Date;
  resetPasswordToken: string;
  resetPasswordExpiry: Date;
  activeCampaignsCount?: number;
  integrationsCount?: number;
  getActiveCampaignsCount(): Promise<number>;
  getIntegrationsCount(): Promise<number>;
  setPassword(password: string): Promise<void>;
  checkPassword(password: string): Promise<boolean>;
  generateVerificationToken(): Promise<void>;
  getSmsSuccessRate(): Promise<{
    success: number;
    failed: number;
    total: number;
    successRate: number;
  }>;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true },
  surname: { type: String, required: true },
  password: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
  },
  isAdmin: { type: Boolean, default: false },
  credits: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  expiresat: { type: Date },
  createdAt: { type: Date, default: Date.now },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },
});

// Pre-save hook para hash de senha
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Método para gerar token de verificação
UserSchema.methods.generateVerificationToken =
  async function (): Promise<string> {
    // Gera o token bruto
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash do token bruto
    const hashedToken = await bcrypt.hash(rawToken, 10);

    // Salva o hash e a expiração no documento
    this.verificationToken = hashedToken;
    this.expiresat = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expira em 24 horas

    console.log("Token bruto enviado ao cliente:", rawToken);
    console.log("Hash armazenado no banco:", hashedToken);

    // Retorna o token bruto para envio no link de verificação
    return rawToken;
  };

// Método para definir a senha
UserSchema.methods.setPassword = async function (password: string) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
};

// Método para checar a senha
UserSchema.methods.checkPassword = function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.getActiveCampaignsCount = async function(): Promise<number> {
  const activeCampaigns = await this.model('Campaign').countDocuments({
    createdBy: this._id,
    status: 'active'
  });
  
  return activeCampaigns;
};

UserSchema.methods.getIntegrationsCount = async function(): Promise<number> {
  const integrationsCount = await this.model('Integration').countDocuments({
    createdBy: this._id
  });
  
  return integrationsCount;
};

UserSchema.methods.getSmsSuccessRate = async function(): Promise<{
  success: number;
  failed: number;
  total: number;
  successRate: number;
}> {
  const successCount = await this.model('CampaignHistory').countDocuments({
    createdBy: this._id,
    responseStatus: 'sent'
  });

  const failedCount = await this.model('CampaignHistory').countDocuments({
    createdBy: this._id,
    responseStatus: 'failed'
  });

  const total = successCount + failedCount;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;

  return {
    success: successCount,
    failed: failedCount,
    total: total,
    successRate: parseFloat(successRate.toFixed(2))
  };
};

export const User = model<IUser>("User", UserSchema);
