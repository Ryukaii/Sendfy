import express, { Request, Response, NextFunction } from "express";

const router = express.Router();

// Rota para verificar JWT
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // O middleware já verifica o token, então se chegou aqui, o JWT é válido
    res.status(200).json({
      success: true,
      message: "Token válido",
      user: req.user, // Retorne informações do usuário se disponível
    });
  } catch (error) {
    next(error); // Encaminha o erro para o middleware de erros
  }
});

export default router;
