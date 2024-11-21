// src/routes/authRoutes.ts
import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import redisClient from "../utils/redisClient"; // Importar o Redis Client
import authMiddleware from "../middleware/auth"; // Importar o middleware de autenticação

const router = express.Router();
//
// Rota de Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body; // Substituído 'username' por 'email'
    const user = await User.findOne({ email }); // Buscar no banco de dados pelo e-mail
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" },
      );

      // Armazenar o token no Redis associado ao userId
      await redisClient.set(user._id.toString(), token, {
        EX: 3600, // Expiração em 1 hora
      });

      res.json({ token });
    } else {
      res.status(401).send("Credenciais inválidas");
    }
  } catch (error) {
    res.status(500).send("Erro no servidor");
  }
});

// Rota para obter informações do usuário
router.get("/user", authMiddleware, async (req, res, next) => {
  try {
    // Lógica adicional da rota após o middleware de autenticação
    res.status(200).send("Token válido"); // Apenas um exemplo, ajuste conforme necessário
  } catch (error) {
    next(error);
  }
});

export default router;
