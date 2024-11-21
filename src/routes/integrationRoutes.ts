// src/routes/integrationRoutes.ts
import express, { Request, Response } from "express";
import { Integration } from "../models/Integration";

const router = express.Router();

// Obter todas as integrações do usuário logado
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).send("Usuário não autorizado");
      return;
    }

    const integrations = await Integration.find({ createdBy: req.user.userId });
    res.status(200).json(integrations);
  } catch (error) {
    res.status(500).send("Erro ao obter integrações");
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Iniciando criação de integração"); // Log inicial

    const { name } = req.body;

    if (!req.user?.userId) {
      console.error("Usuário não autorizado");
      res.status(401).send("Usuário não autorizado");
      return;
    }

    console.log("Usuário autorizado:", req.user.userId); // Log de autorização

    const integration = new Integration({
      name,
      createdBy: req.user.userId,
    });

    await integration.save();
    res.status(201).json({
      message: "Integração criada com sucesso",
      webhookUrl: integration.webhookUrl,
    });
  } catch (error) {
    console.error("Erro ao criar integração:", error); // Log de erro
    res.status(400).send("Erro ao criar integração");
  }
});

// Deletar integração
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const integration = await Integration.findOne({
      _id: req.params.id,
      createdBy: req.user?.userId,
    });
    if (!integration) {
      res.status(404).send("Integração não encontrada");
      return; // Garante que a execução termine aqui
    }

    await Integration.findByIdAndDelete(req.params.id);
    res.send("Integração deletada com sucesso");
  } catch (error) {
    res.status(500).send("Erro ao deletar integração");
  }
});

export default router;
