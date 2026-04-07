import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type * as SMTPTransport from 'nodemailer/lib/smtp-transport';
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
      useFactory: (): Transporter<
        SMTPTransport.SentMessageInfo,
        SMTPTransport.Options
      > => {
        logger.log('Configuring Nodemailer transporter');
        const transportOptions: SMTPTransport.Options =
          getEmailTransportOptions();
        const transporter: Transporter<
          SMTPTransport.SentMessageInfo,
          SMTPTransport.Options
        > = nodemailer.createTransport(transportOptions);

        return transporter;
      },
    },
    EmailService,
    EmailQueueService,
    EmailProcessor,
  ],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
