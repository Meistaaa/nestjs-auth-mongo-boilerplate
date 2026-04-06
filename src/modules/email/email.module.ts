import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { createTransport } from 'nodemailer';
import { EMAIL_QUEUE, EMAIL_TRANSPORTER } from './email.constants';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email-queue.service';
import { EmailService } from './email.service';
import { getEmailTransportOptions } from './email.types';

const logger = new Logger('Email');

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  providers: [
    {
      provide: EMAIL_TRANSPORTER,
      useFactory: () => {
        logger.log('Configuring Nodemailer transporter');
        return createTransport(getEmailTransportOptions());
      },
    },
    EmailService,
    EmailQueueService,
    EmailProcessor,
  ],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
