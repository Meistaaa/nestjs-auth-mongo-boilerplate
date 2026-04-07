import type * as SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface SendOtpEmailJobData {
  to: string;
  name?: string;
  otp: string;
}

export interface SendPasswordResetOtpEmailJobData {
  to: string;
  name?: string;
  otp: string;
}

export interface SendDeleteAccountOtpEmailJobData {
  to: string;
  name?: string;
  otp: string;
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) {
    return fallback;
  }

  return value === 'true';
}

export function getEmailTransportOptions(): SMTPTransport.Options {
  const auth: SMTPTransport.Options['auth'] =
    process.env.MAIL_USER && process.env.MAIL_PASS
      ? {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        }
      : undefined;
  const host = process.env.MAIL_HOST;
  const port = parseNumber(process.env.MAIL_PORT, 587);
  const secure = parseBoolean(process.env.MAIL_SECURE, false);
  const service = process.env.MAIL_SERVICE || 'gmail';

  if (host) {
    const options: SMTPTransport.Options = {
      host,
      port,
      secure,
      auth,
    };

    return options;
  }

  const options: SMTPTransport.Options = {
    service,
    auth,
  };

  return options;
}

export function getEmailFromAddress(): string {
  return process.env.MAIL_FROM || process.env.MAIL_USER || 'no-reply@localhost';
}
