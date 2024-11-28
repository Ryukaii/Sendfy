import { Request, Response, NextFunction } from "express";

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
    const secret = process.env.SECRET_KEY;
    console.log(secret);
    console.log(authHeader);
    if (authHeader === secret) {
      next();
    } else {
      res.status(401).send("Token inválido ou expirado");
    }
  } catch (error) {
    res.status(401).send("Autenticação falhou");
  }
};

export default authMiddleware;
