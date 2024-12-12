import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redisClient from "../utils/redisClient";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).send("Token não fornecido");
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    // Verificar o token no Redis
    const cachedToken = await redisClient.get(decoded.userId);
    if (cachedToken && cachedToken === token) {
      req.user = decoded; // Adiciona o usuário à requisição para uso futuro
      next();
    } else {
      res.status(401).send("Token inválido ou expirado");
    }
  } catch (error) {
    res.status(401).send("Autenticação falhou");
  }
};

export default authMiddleware;
