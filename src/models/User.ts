import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  _id: Types.ObjectId; // Especificando explicitamente que `_id` é do tipo `ObjectId`
  username: string;
  password: string;
  isAdmin: boolean;
  credits: number;
  setPassword(password: string): Promise<void>;
  checkPassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  credits: { type: Number, default: 0 },
});

// Método para definir a senha, fazendo o hash com bcrypt
UserSchema.methods.setPassword = async function (password: string) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
};

// Método para checar a senha, comparando com o hash armazenado
UserSchema.methods.checkPassword = function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const User = model<IUser>("User", UserSchema);
