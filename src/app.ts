// src/app.ts
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import "express-async-errors";
import { schedulerService } from "./services/schedulerService";

// Middlewares
import authenticate from "./middleware/auth";
import { errorHandler } from "./middleware/errors";

// Rotas
import authRoutes from "./routes/authRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import sendSMSRoutes from "./routes/smsRoutes";
import verifyJWT from "./routes/verify-jwt";
import payment from "./routes/paymentRoutes";

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar o Express
const app = express();

// Middleware para processar JSON
app.use(bodyParser.json());
app.use(express.json());

// Configuração do MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Conexão com o MongoDB estabelecida com sucesso");
  })
  .catch((error) => {
    console.error("Erro ao conectar ao MongoDB:", error);
  });

async function startServer() {
  await schedulerService.loadScheduledMessages();
}
startServer();

// Configurar rotas
app.use("/auth", authRoutes);
app.use("/campaign", authenticate, campaignRoutes);
app.use("/integration", authenticate, integrationRoutes);
app.use("/sms", sendSMSRoutes);
app.use("/verify-jwt", verifyJWT);
app.use("/payment", payment);
app.use("/api", webhookRoutes); // Adiciona as rotas de webhooks

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

export default app;
