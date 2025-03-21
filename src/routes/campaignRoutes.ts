import express, { Request, Response, NextFunction } from "express";
import { Campaign } from "../models/Campaign";
import { CampaignHistory } from "../models/CampaignHistory";
import { Integration } from "../models/Integration"; // Assumindo que existe um modelo de integração para buscar o webhookUrl

const router = express.Router();

router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.query.userId) {
        res.status(401).json({ error: "Usuário não autorizado" });
        return;
      }

      const campaings = await Integration.find({
        createdBy: req.query.userId,
      });
      res.status(200).json(campaings);
    } catch (error) {
      next(error); // Encaminhar erro para o middleware de erros
    }
  },
);

// Criar campanha
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, integrationName, tipoEvento, messages, status } = req.body;

      if (!req.user?.userId) {
        res.status(401).send("Usuário não autorizado");
        return;
      }

      const integration = await Integration.findOne({ name: integrationName });
      if (!integration) {
        res.status(404).send("Integração não encontrada");
        return;
      }

      const campaign = new Campaign({
        name,
        integrationName,
        tipoEvento,
        messages,
        createdBy: req.user.userId,
        status: status || "pending",
      });

      await campaign.save();
      res.status(201).send("Campanha criada com sucesso");
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
      res.status(400).send("Erro ao criar campanha");
    }
  },
);

//Atualiza Campanha
router.put(
  "/edit-campaign",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.query;
      const { name, integrationName, tipoEvento, messages, status } = req.body;

      if (!id) {
        res.status(400).json({ error: "ID da campanha é obrigatório." });
        return;
      }

      const updatedCampaign = await Campaign.findByIdAndUpdate(
        id,
        { name, integrationName, tipoEvento, messages, status },
        { new: true },
      );

      if (!updatedCampaign) {
        res.status(404).json({ error: "Campanha não encontrada." });
        return;
      }

      res.status(200).json(updatedCampaign);
    } catch (error) {
      res.status(500).json({ error: "Erro ao editar a campanha." });
    }
  },
);

// Deletar campanha
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        createdBy: req.user?.userId,
      });

      if (!campaign) {
        res.status(404).json({ error: "Campanha não encontrada" });
        return;
      }

      await Campaign.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Campanha deletada com sucesso" });
    } catch (error) {
      next(error); // Encaminhar erro para o middleware de erros
    }
  }
);

export default router;
