import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

// Configurar transporte de e-mail
const transporter: Transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net", // Servidor SMTP do provedor
  port: 587, // Porta (587 para TLS, 465 para SSL)
  secure: false, // true para SSL, false para TLS
  auth: {
    user: process.env.EMAIL_USER as string, // Usuário do e-mail
    pass: process.env.EMAIL_PASS as string, // Senha do e-mail
  },
});

// Verificar transporte no início
transporter.verify((error, success) => {
  if (error) {
    console.error("Erro ao conectar ao serviço de e-mail:", error);
  } else {
    console.log("Transporte configurado com sucesso!");
  }
});

// Interface para os dados de envio
interface EmailOptions {
  to: string; // Destinatário(s)
  subject: string; // Assunto
  html: string; // Corpo em HTML
  from?: string; // Remetente (opcional, padrão configurado no transporte)
}

// Função utilitária para enviar e-mails
export const sendEmail = async ({
  to,
  subject,
  html,
  from,
}: EmailOptions): Promise<void> => {
  try {
    const mailOptions: SendMailOptions = {
      from: from || `"Sistema" <${process.env.EMAIL_USER}>`, // Usa o remetente padrão se nenhum for especificado
      to, // Destinatário
      subject, // Assunto
      html, // Corpo do e-mail
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("E-mail enviado:", info);
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    throw new Error("Erro ao enviar o e-mail.");
  }
};
