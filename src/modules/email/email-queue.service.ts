import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { EMAIL_QUEUE, EmailJobName } from './email.constants';
import type { SendOtpEmailJobData } from './email.types';

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  queueOtpEmail(payload: SendOtpEmailJobData) {
    return this.emailQueue.add(EmailJobName.SendOtpEmail, payload, {
      jobId: `${EmailJobName.SendOtpEmail}:${payload.to}:${Date.now()}`,
    });
  }
}
