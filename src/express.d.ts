// src/types/express.d.ts
import { Request } from "express";

declare module "express" {
  interface Request {
    user?: any; // Ou defina um tipo específico para `user` se você souber como ele se parece, por exemplo: `{ userId: string }`
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string; // Ajuste o tipo conforme necessário, por exemplo, { userId: string, name: string }
    };
  }
}
