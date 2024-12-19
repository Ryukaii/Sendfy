import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 14006,
  },
});

redisClient.on("error", (err) => {
  console.error("Erro ao conectar no Redis:", err);
});

(async () => {
  await redisClient.connect();
  console.log("Conectado ao Redis!");
})();

export default redisClient;
