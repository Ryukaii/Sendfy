import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import redisClient from "../utils/redisClient";

const router = express.Router();

// Rota de Registro
router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password, surname } = req.body;

  if (!password || password.length < 8) {
    res
      .status(400)
      .json({ error: "Password must be at least 8 characters long" });
    return;
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const newUser = new User({
    username,
    email,
    password: password,
    surname,
    isVerified: false, // Novo usuário não é verificado por padrão
  });

  // Gerar token de verificação
  await newUser.generateVerificationToken();
  await newUser.save();

  // Opcional: Enviar e-mail de verificação (implementar lógica de envio)

  res.status(201).json({
    message:
      "User registered successfully. Please verify your email to activate your account.",
  });
});

// Rota de Login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  // Verificar se o usuário está verificado
  if (!user.isVerified) {
    res.status(403).json({
      error:
        "Account not verified. Please verify your email before logging in.",
    });
    return;
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" },
  );
  await redisClient.set(user._id.toString(), token, { EX: 3600 });

  res.json({ token, userId: user._id });
});

// Rota para verificar token JWT e obter dados do usuário
router.get("/user", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Authorization header missing or invalid" });
      return;
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
    next(error);
  }
});

// Nova rota para verificar o token de verificação do usuário
router.post("/verify", async (req: Request, res: Response) => {
  const { email, token } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Verificar se o token de verificação expirou
  if (Date.now() > new Date(user.expiresat).getTime()) {
    res
      .status(400)
      .json({ error: "Verification token expired. Please request a new one." });
    return;
  }

  // Verificar se o token de verificação é válido
  const isValidToken = await bcrypt.compare(token, user.verificationToken);
  if (!isValidToken) {
    res.status(400).json({ error: "Invalid verification token" });
    return;
  }

  // Atualizar o status do usuário para verificado
  user.isVerified = true;
  user.verificationToken = ""; // Limpar token
  await user.save();

  res
    .status(200)
    .json({ message: "Account verified successfully. You can now log in." });
});

export default router;
