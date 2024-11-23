import express, { Request, Response, NextFunction } from "express";
import { Campaign } from "../models/Campaign";
import { CampaignHistory } from "../models/CampaignHistory";
import { Integration } from "../models/Integration"; // Assumindo que existe um modelo de integração para buscar o webhookUrl

const router = express.Router();

// Criar campanha
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, integrationName, tipoEvento, messageTemplate, delay } =
        req.body;

      if (!req.user?.userId) {
        res.status(401).send("Usuário não autorizado");
        return;
      }

      // Buscar a integração pelo nome informado
      const integration = await Integration.findOne({ name: integrationName });

      if (!integration) {
        res.status(404).send("Integração não encontrada");
        return;
      }

      // Criar campanha usando o webhookUrl da integração encontrada
      const campaign = new Campaign({
        name,
        webhookUrl: integration.webhookUrl,
        tipoEvento,
        messageTemplate,
        createdBy: req.user.userId,
        integrationName,
        delay, // Adicionei o integrationName ao criar a campanha
      });

      await campaign.save();
      res.status(201).send("Campanha criada com sucesso");
    } catch (error) {
      console.error("Erro ao criar campanha:", error); // Log do erro para entender o problema
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
      const updateData = req.body;

      if (!id) {
        res.status(400).json({ error: "ID da campanha é obrigatório." });
        return;
      }

      const updatedCampaign = await Campaign.findByIdAndUpdate(id, updateData, {
        new: true,
      });

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

// Executar campanha
router.post(
  "/:id/execute",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        createdBy: req.user?.userId,
      });
      if (!campaign) {
        res.status(404).send("Campanha não encontrada");
        return;
      }

      // Aqui seria feita a requisição ao webhook e a API de SMS
      // Simulação de envio de SMS usando a mensagem template
      const responseStatus = "success";
      const messageContent = campaign.messageTemplate;

      const campaignHistory = new CampaignHistory({
        campaignId: campaign._id,
        responseStatus,
        messageContent,
      });
      await campaignHistory.save();

      res.send("Campanha executada com sucesso");
    } catch (error) {
      res.status(500).send("Erro ao executar campanha");
    }
  },
);

export default router;
