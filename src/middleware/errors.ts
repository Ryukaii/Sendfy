import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/CustomError";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof CustomError) {
    const { statusCode, errors, logging } = err;

    if (logging) {
      console.error(
        JSON.stringify({ statusCode, errors, stack: err.stack }, null, 2),
      );
    }

    // Envia a resposta e retorna explicitamente void para compatibilidade com ErrorRequestHandler
    res.status(statusCode).json({ errors });
    return;
  }

  console.error(err);
  res.status(500).json({ errors: [{ message: "Algo deu errado!" }] });
};
