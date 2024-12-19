import express, { Request, Response, NextFunction } from "express";
import { sendSms } from "../utils/smsUtils";

const router = express.Router();

// Nova rota - Envio manual de SMS
router.post(
  "/send-sms",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { telefone, mensagem } = req.body;

      if (!telefone || !mensagem) {
        res.status(400).json({ error: "Telefone e mensagem são obrigatórios" });
        return;
      }

      // Enviar SMS
      await sendSms(telefone, mensagem);

      res.status(200).json({ message: "SMS enviado com sucesso" });
    } catch (error) {
      next(error); // Encaminhar o erro para o middleware de tratamento de erros
    }
  },
);

export default router;
