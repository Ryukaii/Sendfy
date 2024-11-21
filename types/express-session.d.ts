// types/express-session.d.ts
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    user: { [key: string]: any }; // Altere isso conforme a estrutura dos dados do seu usuário
  }
}
