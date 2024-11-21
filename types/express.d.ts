import { Request } from "express";

declare module "express" {
  interface Request {
    user?: {
      userId: string;
      email: string;
      [key: string]: any; // Isso permite adicionar mais propriedades no objeto user se necessário
    };
  }
}
