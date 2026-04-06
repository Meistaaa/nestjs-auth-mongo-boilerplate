import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface SendOtpEmailJobData {
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
  const host = process.env.MAIL_HOST;
  const port = parseNumber(process.env.MAIL_PORT, 587);
  const secure = parseBoolean(process.env.MAIL_SECURE, false);
  const service = process.env.MAIL_SERVICE || 'gmail';
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (host) {
    return {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    };
  }

  return {
    service,
    auth: user && pass ? { user, pass } : undefined,
  };
}

export function getEmailFromAddress() {
  return process.env.MAIL_FROM || process.env.MAIL_USER || 'no-reply@localhost';
}
