import cron from "node-cron";
import { IScheduledMessage } from "../types/scheduledMessage";
import { sendSms } from "../utils/smsUtils"; // Ajuste o caminho conforme necessário
import { CampaignHistory } from "../models/CampaignHistory"; // Importe o modelo CampaignHistory
import { ScheduledMessage } from "../models/ScheduledMessage"; // Importe o modelo ScheduledMessage
import mongoose from "mongoose";

export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  async scheduleMessage(message: IScheduledMessage): Promise<void> {
    const safeMessage: IScheduledMessage = {
      ...message,
      createdBy: message.createdBy ?? new mongoose.Types.ObjectId(),
    };

    const {
      campaignId,
      phone,
      content,
      scheduledTime,
      transactionId,
      createdBy,
    } = message;

    const job = cron.schedule(
      this.dateToCronExpression(scheduledTime),
      async () => {
        await this.executeScheduledMessage(message);
      },
      {
        scheduled: true,
        timezone: "UTC", // Ajuste o fuso horário conforme necessário
      },
    );

    const campaignHistory = new CampaignHistory({
      campaignId,
      createdBy,
      messageContent: content,
      phone,
      transaction_id: transactionId,
      type: "scheduled", // ou outro tipo apropriado
    });

    await campaignHistory.save();
    this.jobs.set(campaignHistory._id.toString(), job);
  }

  private async executeScheduledMessage(
    message: IScheduledMessage,
  ): Promise<void> {
    const { phone, content, transactionId } = message;
    try {
      await sendSms(phone, content);
      const campaignHistory = await CampaignHistory.findOneAndUpdate(
        { transaction_id: transactionId },
        {
          $set: {
            responseStatus: "sent",
            executedAt: new Date(),
          },
        },
        { new: true },
      );

      if (campaignHistory) {
        const job = this.jobs.get(campaignHistory._id.toString());
        if (job) {
          job.stop();
          this.jobs.delete(campaignHistory._id.toString());
        }
      }
    } catch (error) {
      console.error(`Erro ao enviar SMS agendado: ${error}`);
      await CampaignHistory.findOneAndUpdate(
        { transaction_id: transactionId },
        {
          $set: {
            responseStatus: "failed",
            executedAt: new Date(),
          },
        },
      );
    }
  }

  async loadScheduledMessages(): Promise<void> {
    const messages = await ScheduledMessage.find({
      scheduledTime: { $gt: new Date() },
    });
    for (const message of messages) {
      await this.scheduleMessage(toScheduledMessage(message));
    }
  }

  stopAllJobs(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();
  }

  private dateToCronExpression(date: Date): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // getMonth() retorna 0-11
    const dayOfWeek = date.getDay();

    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }
}

function toScheduledMessage(doc: any): IScheduledMessage {
  return {
    campaignId: doc.campaignId,
    phone: doc.phone,
    content: doc.content,
    scheduledTime: doc.scheduledTime,
    transactionId: doc.transactionId,
    createdBy: doc.createdBy ?? new mongoose.Types.ObjectId(),
  };
}

export const schedulerService = new SchedulerService();
