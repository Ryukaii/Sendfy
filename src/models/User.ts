import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcrypt";

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
  setPassword(password: string): Promise<void>;
  checkPassword(password: string): Promise<boolean>;
  generateVerificationToken(): Promise<void>;
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
  async function (): Promise<void> {
    const crypto = require("crypto");
    this.verificationToken = crypto.randomBytes(32).toString("hex");
    this.expiresat = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expira em 24 horas
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

export const User = model<IUser>("User", UserSchema);
