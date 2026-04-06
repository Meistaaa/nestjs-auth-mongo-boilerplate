import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { SentMessageInfo, Transporter } from 'nodemailer';
import { EMAIL_TRANSPORTER } from './email.constants';
import { getEmailFromAddress } from './email.types';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_TRANSPORTER)
    private readonly transporter: Transporter,
  ) {}

  onModuleInit() {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      this.logger.warn(
        'MAIL_USER or MAIL_PASS is missing. Email delivery will fail until mail credentials are configured.',
      );
    }
  }

  sendOtpEmail(
    to: string,
    name: string | undefined,
    otp: string,
  ): Promise<SentMessageInfo> {
    const greetingName = name?.trim() || 'there';

    return this.transporter.sendMail({
      from: getEmailFromAddress(),
      to,
      subject: 'Your Africonn verification code',
      text: `Hello ${greetingName}, your verification code is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">Verify your email</h2>
          <p>Hello ${greetingName},</p>
          <p>Your Africonn verification code is:</p>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }
}
