// src/index.ts
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authenticate from "./middleware/auth";
import authRoutes from "./routes/authRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import webhookRoutes from "./routes/webhookRoutes"; // Importa as rotas dos webhooks

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Conexão com o MongoDB estabelecida com sucesso");
  })
  .catch((error) => {
    console.error("Erro ao conectar ao MongoDB:", error);
  });

// Configuração do servidor Express
const app = express();
app.use(bodyParser.json());

// Rotas
app.use("/auth", authRoutes);
app.use("/campaign", authenticate, campaignRoutes);
app.use("/integration", authenticate, integrationRoutes);
app.use("/", webhookRoutes); // Adiciona as rotas de webhooks

// Inicializando o servidor
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
