import path from "path";
import session from "express-session";
import express, { Express, Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
//import authRoutes from "./routes/authRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import webhookRoutes from "./routes/webhookRoutes"; // Importa as rotas dos webhooks

/*
import {
  isAuthenticated,
  setLocals,
  AuthenticatedRequest,
} from "./middleware/auth";
*/

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
const app: Express = express();
const port = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "ssg341",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  }),
);

// Aplicando o middleware setLocals
app.use(setLocals);

// Rotas de autenticação
//app.use("/auth", authRoutes);
app.use("/campaign", campaignRoutes);
app.use("/integration", integrationRoutes);
app.use("/", webhookRoutes); // Adiciona as rotas de webhooks

// Inicializando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
