import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
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
