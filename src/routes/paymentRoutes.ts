import express, { Request, Response } from "express";
import axios from "axios";
import { Payment } from "../models/Payment"; // Modelo para salvar informações de pagamento

const router = express.Router();

//rota para consultar na Api se pix foi pago

router.get(
  "/pix-status",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { externalId } = req.query;
      // add ?id= to the url
      const response = await axios.get(
        "https://app.for4payments.com.br/api/v1/transaction.getPayment",
        {
          headers: {
            Authorization: process.env.FOR4PAYMENTS_SECRET, // Adiciona o cabeçalho Authorization
          },
          params: {
            id: externalId, // Adiciona o parâmetro à URL
          },
        },
      );
      res.status(200).json({
        message: response.data.status,
      });
    } catch (error) {
      console.error("Erro ao gerar QR Code Pix:", error);
      res.status(500).send("Erro ao gerar QR Code Pix.");
    }
  },
);

router.post(
  "/generate-pix",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, cpf, phone, amount } = req.body;

      if (!name || !email || !cpf || !phone || !amount) {
        res.status(400).send("Parâmetros inválidos.");
        return;
      }

      const requestBody = {
        name: name,
        email: email,
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        paymentMethod: "PIX",
        creditCard: {
          token: "string",
          installments: 12,
          number: "string",
          holder_name: "string",
          cvv: "string",
          expiration_month: "string",
          expiration_year: "string",
        },
        cep: "",
        complement: "",
        number: "",
        street: "",
        district: "",
        city: "",
        state: "",
        utmQuery: "",
        checkoutUrl: "",
        referrerUrl: "",
        externalId: "",
        postbackUrl: "",
        amount: amount,
        traceable: true,
        items: [
          {
            unitPrice: amount,
            title: "Payment",
            quantity: 1,
            tangible: true,
          },
        ],
      };

      const response = await axios.post(
        "https://app.for4payments.com.br/api/v1/transaction.purchase",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.FOR4PAYMENTS_SECRET}`,
          },
        },
      );
      const { pixQrCode, pixCode, id } = response.data;

      // Salvar no banco de dados
      await Payment.create({
        customerName: name,
        email,
        cpf,
        phone,
        amount,
        pixCode,
        qrCodeImage: pixQrCode,
        createdAt: new Date(),
      });

      res.status(200).json({
        message: "QR Code gerado com sucesso.",
        id,
        pixQrCode,
        pixCode,
      });
    } catch (error) {
      console.error("Erro ao gerar QR Code Pix:", error);
      res.status(500).send("Erro ao gerar QR Code Pix.");
    }
  },
);

export default router;
