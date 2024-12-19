// utils/smsUtils.ts
import axios from "axios";

export const sendSms = async (
  telefone: string,
  messageContent: string,
): Promise<void> => {
  const smsApiUrl = "https://api.smsdev.com.br/v1/send";
  const smsApiKey = process.env.SMS_API_KEY;
  if (!smsApiKey) {
    throw new Error("Chave da API de SMS não configurada");
  }

  const response = await axios.post(smsApiUrl, {
    key: smsApiKey,
    type: 9,
    number: telefone,
    msg: messageContent,
  });
  console.log(response.data);
};
