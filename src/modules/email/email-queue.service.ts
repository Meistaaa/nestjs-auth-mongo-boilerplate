import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { EMAIL_QUEUE, EmailJobName } from './email.constants';
import type {
  SendDeleteAccountOtpEmailJobData,
  SendOtpEmailJobData,
  SendPasswordResetOtpEmailJobData,
} from './email.types';

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  queueOtpEmail(payload: SendOtpEmailJobData) {
    return this.emailQueue.add(EmailJobName.SendOtpEmail, payload, {
      jobId: `${EmailJobName.SendOtpEmail}:${payload.to}:${Date.now()}`,
    });
  }

  queuePasswordResetOtpEmail(payload: SendPasswordResetOtpEmailJobData) {
    return this.emailQueue.add(
      EmailJobName.SendPasswordResetOtpEmail,
      payload,
      {
        jobId: `${EmailJobName.SendPasswordResetOtpEmail}:${payload.to}:${Date.now()}`,
      },
    );
  }

  queueDeleteAccountOtpEmail(payload: SendDeleteAccountOtpEmailJobData) {
    return this.emailQueue.add(EmailJobName.SendDeleteAccountOtpEmail, payload, {
      jobId: `${EmailJobName.SendDeleteAccountOtpEmail}:${payload.to}:${Date.now()}`,
    });
  }
}
