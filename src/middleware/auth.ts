import { Request, Response, NextFunction, RequestHandler } from "express";
import { User, IUser } from "../models/User";

declare module "express-session" {
  interface SessionData {
    userId?: string; // MongoDB usa strings para IDs, certifique-se de que o tipo está correto
  }
}

export interface AuthenticatedRequest extends Request {
  user?: IUser; // Definir que `user` é do tipo `IUser` ou indefinido
}

// Middleware para verificar se o usuário está autenticado
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const sessionReq = req as AuthenticatedRequest;
    if (!sessionReq.session.userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(sessionReq.session.userId);
    if (!user) {
      await new Promise<void>((resolve) =>
        sessionReq.session.destroy(() => resolve()),
      ); // Garantindo destruição da sessão
      return res.redirect("/login");
    }

    sessionReq.user = user; // Definindo o usuário autenticado no contexto da requisição
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.redirect("/login");
  }
};

// Middleware para verificar se o usuário é administrador
export const isAdmin: RequestHandler = async (req, res, next) => {
  try {
    const sessionReq = req as AuthenticatedRequest;
    if (!sessionReq.user || !sessionReq.user.isAdmin) {
      return res.redirect("/");
    }
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.redirect("/");
  }
};

// Middleware para definir variáveis locais
export const setLocals: RequestHandler = (req, res, next) => {
  const sessionReq = req as AuthenticatedRequest;
  res.locals.user = sessionReq.user;
  res.locals.hideNav = ["/login", "/register"].includes(req.path);
  next();
};
