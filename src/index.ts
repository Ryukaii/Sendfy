// src/index.ts
import app from "./app";

const PORT = process.env.PORT || 3000;

// Inicializando o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
