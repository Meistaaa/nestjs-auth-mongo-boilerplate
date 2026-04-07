export const EMAIL_TRANSPORTER = Symbol('EMAIL_TRANSPORTER');
export const EMAIL_QUEUE = 'mail';

export const EmailJobName = {
  SendOtpEmail: 'send-otp-email',
  SendPasswordResetOtpEmail: 'send-password-reset-otp-email',
  SendDeleteAccountOtpEmail: 'send-delete-account-otp-email',
} as const;
