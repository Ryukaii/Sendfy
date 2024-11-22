// src/routes/authRoutes.ts
import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import redisClient from "../utils/redisClient";

const router = express.Router();

// Rota de Registro
// Rota de Registro
router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();

  const token = jwt.sign(
    { userId: newUser._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" },
  );
  await redisClient.set(newUser._id.toString(), token, { EX: 3600 });

  res.status(201).json({ token, userId: newUser._id });
});

// Rota de Login
// Rota de Login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" },
  );
  await redisClient.set(user._id.toString(), token, { EX: 3600 });

  res.json({ token, userId: user._id });
});

// Nova rota para verificar token JWT
//
router.get(
  "/user",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res
          .status(401)
          .json({ error: "Authorization header missing or invalid" });
        return; // Adicione "return" para evitar execução adicional
      }

      const token = authHeader.split(" ")[1];

      // Verificar o token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
      };

      // Verificar se o token ainda está ativo no Redis
      const storedToken = await redisClient.get(decoded.userId);
      if (storedToken !== token) {
        res.status(401).json({ error: "Token is no longer valid" });
        return;
      }

      // Retornar sucesso com dados do usuário
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error("JWT verification error:", error);
      next(error); // Certifique-se de encaminhar o erro ao middleware de erros
    }
  },
);

export default router;
