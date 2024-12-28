import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import redisClient from "../utils/redisClient";
import { sendEmail } from "../utils/emailUtils"; // Ajuste o caminho conforme necessário
import crypto from "crypto";

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
    res.status(400).json({ error: "Email already in use", status: "email" });
    return;
  }

  const newUser = new User({
    username,
    email,
    password: password,
    surname,
    isVerified: false, // Novo usuário não é verificado por padrão
  });

  // Gerar o token de verificação
  // Gerar token de verificação
  const rawToken = await newUser.generateVerificationToken();
  await newUser.save();

  // Opcional: Enviar e-mail de verificação (implementar lógica de envio)

  res.status(201).json({
    message:
      "User registered successfully. Please verify your email to activate your account.",
    status: "success",
  });

  const baseURL = process.env.BASE_URL || "https://api.sendfy.website/auth/";
  const linkAut = `${baseURL}verify?token=${rawToken}&email=${email}`;

  const htmlContent = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de E-mail</title>
      <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; color: #333; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); overflow: hidden; }
          .header { background-color: #4caf50; padding: 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; }
          .content p { line-height: 1.6; }
          .btn { display: block; width: fit-content; margin: 20px auto; padding: 12px 20px; background-color: #4caf50; color: #ffffff; text-decoration: none; font-size: 16px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .btn:hover { background-color: #45a049; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #777; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>Confirme seu E-mail</h1>
          </div>
          <div class="content">
              <p>Olá,</p>
              <p>Obrigado por se cadastrar! Para ativar sua conta, clique no botão abaixo para confirmar seu e-mail:</p>
              <a href="${linkAut}" class="btn">Confirmar E-mail</a>
              <p>Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:</p>
              <p><a href="${linkAut}" style="word-wrap: break-word; color: #4caf50;">${linkAut}</a></p>
          </div>
          <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda.</p>
              <p>&copy; 2024 Sua Empresa. Todos os direitos reservados.</p>
          </div>
      </div>
  </body>
  </html>`;

  try {
    await sendEmail({
      to: email,
      subject: "Bem vindo ao SendFy",
      html: htmlContent,
    });
    console.log("E-mail enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar o e-mail:", error);
  }
});

// Rota de Login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Credenciais inválidas" });
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

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" },
  );

  await redisClient.set(user._id.toString(), token, { EX: 3600 });
  await redisClient.set(`refresh_${user._id}`, refreshToken);

  res.json({
    token,
    refreshToken,
    expiresIn: 3600,
    userId: user._id,
    username: user.username,
    surname: user.surname,
    email: user.email,
    credits: user.credits,
  });
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
router.get(
  "/verify",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("Iniciando processo de verificação");
    try {
      const token = req.query.token as string | undefined;
      const email = req.query.email as string | undefined;
      console.log(`Token recebido: ${token}`);
      console.log(`Email recebido: ${email}`);

      if (!token || !email) {
        console.log("Token ou email ausentes na requisição");
        res.status(400).json({ error: "Token and email are required" });
        return;
      }

      const user = await User.findOne({ email: email as string });
      console.log(`Usuário encontrado: ${user ? "Sim" : "Não"}`);

      if (!user) {
        console.log("Usuário não encontrado");
        res.status(404).json({ error: "User not found" });
        return;
      }

      console.log(`Usuário já verificado: ${user.isVerified}`);
      if (user.isVerified) {
        res.status(400).json({ error: "Email already verified" });
        return;
      }

      console.log(`Token armazenado: ${user.verificationToken}`);
      console.log(`Token recebido: ${token}`);
      const isValidToken = await bcrypt.compare(token, user.verificationToken);
      if (!isValidToken) {
        console.log("Token inválido");
        res.status(400).json({ error: "Invalid token" });
        return;
      }

      user.isVerified = true;
      user.verificationToken = "";
      await user.save();
      console.log("Usuário verificado com sucesso");
      res.redirect(
        `${process.env.APP_BASE_URL}authLogin?verify=true` ||
          "http://localhost:3000/",
      );
      return;
    } catch (error) {
      console.error("Erro durante a verificação:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  },
);

router.post("/refresh-token", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as any;
    const storedRefreshToken = await redisClient.get(
      `refresh_${decoded.userId}`,
    );

    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      res.status(401).json({ error: "Refresh token inválido" });
      return;
    }

    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    await redisClient.set(decoded.userId, newAccessToken);

    res.json({
      accessToken: newAccessToken,
      expiresIn: 3600,
    });
  } catch (error) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora a partir da data atual

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiry = resetTokenExpiry;
  await user.save();

  const baseURL = process.env.APP_BASE_URL || "https://api.sendfy.website/";
  const resetLink = `${baseURL}auth/changePassword?token=${resetToken}&email=${email}`;

  const htmlContent = `
    <h1>Redefinição de Senha</h1>
    <p>Olá,</p>
    <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha:</p>
    <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block;">Redefinir Senha</a>
    <p>Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:</p>
    <p>${resetLink}</p>
    <p>Este link expirará em 1 hora.</p>
  `;

  try {
    await sendEmail({
      to: email,
      subject: "Redefinição de Senha",
      html: htmlContent,
    });
    res.status(200).json({ message: "E-mail de redefinição de senha enviado com sucesso" });
  } catch (error) {
    console.error("Erro ao enviar o e-mail:", error);
    res.status(500).json({ error: "Erro ao enviar o e-mail de redefinição de senha" });
  }
});


router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, email, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.resetPasswordToken !== token || user.resetPasswordExpiry < new Date()) {
    res.status(400).json({ error: "Token inválido ou expirado" });
    return;
  }

  user.password = newPassword;
  user.resetPasswordToken = "";
  user.resetPasswordExpiry = new Date();
  await user.save();

  res.status(200).json({ message: "Senha redefinida com sucesso" });
});



export default router;
