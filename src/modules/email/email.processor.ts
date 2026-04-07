import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { EMAIL_QUEUE, EmailJobName } from './email.constants';
import { EmailService } from './email.service';
import type {
  SendDeleteAccountOtpEmailJobData,
  SendOtpEmailJobData,
  SendPasswordResetOtpEmailJobData,
} from './email.types';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(
    job: Job<
      | SendOtpEmailJobData
      | SendPasswordResetOtpEmailJobData
      | SendDeleteAccountOtpEmailJobData
    >,
  ) {
    switch (job.name) {
      case EmailJobName.SendOtpEmail:
        await this.emailService.sendOtpEmail(
          job.data.to,
          job.data.name,
          job.data.otp,
        );
        this.logger.log(`OTP email sent to ${job.data.to}`);
        return;
      case EmailJobName.SendPasswordResetOtpEmail:
        await this.emailService.sendPasswordResetOtpEmail(
          job.data.to,
          job.data.name,
          job.data.otp,
        );
        this.logger.log(`Password reset OTP email sent to ${job.data.to}`);
        return;
      case EmailJobName.SendDeleteAccountOtpEmail:
        await this.emailService.sendDeleteAccountOtpEmail(
          job.data.to,
          job.data.name,
          job.data.otp,
        );
        this.logger.log(`Delete account OTP email sent to ${job.data.to}`);
        return;
      default:
        this.logger.warn(`Unhandled email job: ${job.name}`);
    }
  }
}
