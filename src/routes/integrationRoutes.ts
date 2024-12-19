import express, { Request, Response, NextFunction } from "express";
import { Integration } from "../models/Integration";

const router = express.Router();

// Obter todas as integrações do usuário logado
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.query.userId) {
        res.status(401).json({ error: "Usuário não autorizado" });
        return;
      }

      const integrations = await Integration.find({
        createdBy: req.query.userId,
      });
      res.status(200).json(integrations);
    } catch (error) {
      next(error); // Encaminhar erro para o middleware de erros
    }
  },
);

// Criar uma nova integração
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;

      if (!req.user?.userId) {
        res.status(401).json({ error: "Usuário não autorizado" });
        return;
      }

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
      next(error); // Encaminhar erro para o middleware de erros
    }
  },
);

// Deletar integração
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const integration = await Integration.findOne({
        _id: req.params.id,
      });

      if (!integration) {
        res.status(404).json({ error: "Integração não encontrada" });
        return;
      }

      await Integration.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Integração deletada com sucesso" });
    } catch (error) {
      next(error); // Encaminhar erro para o middleware de erros
    }
  },
);

export default router;
