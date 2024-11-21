// src/routes/authRoutes.ts
import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import redisClient from "../utils/redisClient";

const router = express.Router();
app.use(express.json());

// Rota de Registro
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verificar se o e-mail já está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Salvar no banco de dados
    await newUser.save();

    // Gerar token JWT
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    // Salvar no Redis
    await redisClient.set(newUser._id.toString(), token, {
      EX: 3600, // Expira em 1 hora
    });

    res.status(201).json({ token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send("Error during registration");
  }
});

// Rota de Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" },
      );

      await redisClient.set(user._id.toString(), token, {
        EX: 3600,
      });

      res.json({ token });
    } else {
      res.status(401).send("Credenciais inválidas");
    }
  } catch (error) {
    res.status(500).send("Erro no servidor");
  }
});

export default router;
