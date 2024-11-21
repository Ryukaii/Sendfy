import express, { Request, Response } from "express";

const smsRoutes = express.Router();

// Rota para renderizar o formulário de SMS
smsRoutes.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    res.render("sms");
  } catch (error) {
    res.status(500).send("Erro ao carregar o formulário de SMS");
  }
});

// Rota para processar o envio de SMS (API simulada)
smsRoutes.post(
  "/api/send-sms",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        res
          .status(400)
          .json({
            success: false,
            message: "Número de telefone e mensagem são obrigatórios.",
          });
        return;
      }

      // Simulando sucesso no envio do SMS
      res.json({ success: true });
    } catch (error) {
      res.status(500).send("Erro ao enviar SMS");
    }
  },
);

export default smsRoutes;
