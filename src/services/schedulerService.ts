import cron from "node-cron";
import { IScheduledMessage } from "../types/scheduledMessage";
import { sendSms } from "../utils/smsUtils";
import { CampaignHistory } from "../models/CampaignHistory";
import { ScheduledMessage } from "../models/ScheduledMessage";
import { User } from "../models/User";
import mongoose from "mongoose";


export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  async scheduleMessage(message: IScheduledMessage): Promise<void> {
    const safeMessage: IScheduledMessage = {
      ...message,
      createdBy: message.createdBy ?? new mongoose.Types.ObjectId(),
    };

    const { scheduledTime } = safeMessage;

    const job = cron.schedule(
      this.dateToCronExpression(scheduledTime),
      async () => {
        await this.executeScheduledMessage(safeMessage);
      },
      {
        scheduled: true,
        timezone: "America/Sao_Paulo",
      },
    );

    this.jobs.set(safeMessage.transactionId, job);
  }

  private async executeScheduledMessage(
    message: IScheduledMessage,
  ): Promise<void> {
    const { campaignId, phone, content, transactionId, createdBy, userId } = message;

    try {
      await sendSms(phone, content, );

      await User.findByIdAndUpdate(userId, { $inc: { totalSmsSent: 1 } });

      await CampaignHistory.create({
        campaignId,
        message: content,
        executedAt: new Date(),
        recipient: phone,
        createdBy,
        responseStatus: "sent",
      });

      await ScheduledMessage.findOneAndDelete({ transactionId });

      const job = this.jobs.get(transactionId);
      if (job) {
        job.stop();
        this.jobs.delete(transactionId);
      }
    } catch (error) {
      console.error(`Erro ao enviar SMS agendado: ${error}`);
      await CampaignHistory.create({
        campaignId,
        message: content,
        executedAt: new Date(),
        recipient: phone,
        createdBy,
        responseStatus: "failed",
      });
    }
  }

  async loadScheduledMessages(): Promise<void> {
    const messages = await ScheduledMessage.find({
      scheduledTime: { $gt: new Date() },
    });
    for (const message of messages) {
      await this.scheduleMessage(this.toScheduledMessage(message));
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
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  private toScheduledMessage(doc: any): IScheduledMessage {
    return {
      userId: doc.userId,
      campaignId: doc.campaignId,
      phone: doc.phone,
      content: doc.content,
      scheduledTime: doc.scheduledTime,
      transactionId: doc.transactionId,
      createdBy: doc.createdBy ?? new mongoose.Types.ObjectId(),
    };
  }

  async processScheduledMessages(): Promise<void> {
    const now = new Date();
    const messagesToSend = await ScheduledMessage.find({
      scheduledTime: { $lte: now },
    });

    for (const message of messagesToSend) {
      await this.executeScheduledMessage(this.toScheduledMessage(message));
    }
  }
}

export const schedulerService = new SchedulerService();
