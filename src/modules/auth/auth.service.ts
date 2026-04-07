import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { EmailQueueService } from '../email/email-queue.service';
import { UserRepository } from '../user/user.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const DEFAULT_BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

function getBcryptRounds() {
  const rawValue = process.env.BCRYPT_ROUNDS;
  const parsedValue = rawValue ? Number(rawValue) : NaN;

  return Number.isInteger(parsedValue) && parsedValue >= 8 && parsedValue <= 15
    ? parsedValue
    : DEFAULT_BCRYPT_ROUNDS;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async signUp(dto: SignUpDto) {
    const existingUser = await this.userRepository.findOne({
      email: dto.email,
      isDeleted: false,
    });

    if (existingUser?.isEmailVerified) {
      throw new ConflictException('An account with this email already exists');
    }

    if (existingUser && !existingUser.isEmailVerified) {
      const verificationOtp = this.generateOtp();
      const verificationExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

      await this.userRepository.updateById(String(existingUser._id), {
        $set: {
          emailVerificationToken: verificationOtp,
          emailVerificationExpires: verificationExpiry,
        },
      });

      this.queueOtpEmailInBackground({
        to: existingUser.email,
        name: existingUser.name,
        otp: verificationOtp,
      });

      const safeExistingUser = existingUser.toObject();
      Reflect.deleteProperty(safeExistingUser, 'password');
      Reflect.deleteProperty(safeExistingUser, 'emailVerificationToken');
      Reflect.deleteProperty(safeExistingUser, 'emailVerificationExpires');

      return {
        message:
          'Account already exists but is not verified. A new OTP has been sent to your email.',
        data: {
          user: safeExistingUser,
          alreadyExists: true,
          otpResent: true,
        },
      };
    }

    const hashedPassword = await bcrypt.hash(dto.password, getBcryptRounds());
    const verificationOtp = this.generateOtp();
    const verificationExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      emailVerificationToken: verificationOtp,
      emailVerificationExpires: verificationExpiry,
    });

    this.queueOtpEmailInBackground({
      to: user.email,
      name: user.name,
      otp: verificationOtp,
    });

    const safeUser = user.toObject();
    Reflect.deleteProperty(safeUser, 'password');
    Reflect.deleteProperty(safeUser, 'emailVerificationToken');
    Reflect.deleteProperty(safeUser, 'emailVerificationExpires');
    return {
      message: 'User registered successfully. OTP sent to your email.',
      data: {
        user: safeUser,
        alreadyExists: false,
        otpResent: false,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne(
      { email: dto.email, isDeleted: false, isActive: true },
      '+password',
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      const verificationOtp = this.generateOtp();
      const verificationExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

      await this.userRepository.updateById(String(user._id), {
        $set: {
          emailVerificationToken: verificationOtp,
          emailVerificationExpires: verificationExpiry,
        },
      });

      this.queueOtpEmailInBackground({
        to: user.email,
        name: user.name,
        otp: verificationOtp,
      });

      const safeUser = user.toObject();
      Reflect.deleteProperty(safeUser, 'password');
      Reflect.deleteProperty(safeUser, 'emailVerificationToken');
      Reflect.deleteProperty(safeUser, 'emailVerificationExpires');

      return {
        message:
          'Your account is not verified yet. A new OTP has been sent to your email. Please verify your account to continue.',
        data: {
          user: safeUser,
          requiresEmailVerification: true,
          otpResent: true,
        },
      };
    }

    void this.userRepository.updateById(String(user._id), {
      $set: { lastLoginAt: new Date() },
    });

    const safeUser = user.toObject();
    Reflect.deleteProperty(safeUser, 'password');
    return safeUser;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepository.findOne({
      email: dto.email,
      isDeleted: false,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !user.isEmailVerified &&
      user.emailVerificationToken &&
      user.emailVerificationExpires
    ) {
      if (user.emailVerificationExpires.getTime() < Date.now()) {
        throw new BadRequestException('OTP has expired');
      }

      if (user.emailVerificationToken !== dto.otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      await this.userRepository.updateById(String(user._id), {
        $set: {
          isEmailVerified: true,
        },
        $unset: {
          emailVerificationToken: 1,
          emailVerificationExpires: 1,
        },
      });

      return {
        verified: true,
        flow: 'email-verification' as const,
        alreadyVerified: false,
        userId: String(user._id),
      };
    }

    if (user.resetPasswordToken && user.resetPasswordExpires) {
      if (user.resetPasswordExpires.getTime() < Date.now()) {
        throw new BadRequestException('Password reset OTP has expired');
      }

      if (user.resetPasswordToken !== dto.otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      const resetToken = this.generateResetToken();
      const hashedResetToken = this.hashToken(resetToken);
      const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await this.userRepository.updateById(String(user._id), {
        $set: {
          resetPasswordToken: hashedResetToken,
          resetPasswordExpires: resetTokenExpiry,
        },
      });

      return {
        verified: true,
        flow: 'password-reset' as const,
        resetToken,
        expiresAt: resetTokenExpiry,
      };
    }

    if (user.deleteAccountOtp && user.deleteAccountOtpExpires) {
      if (user.deleteAccountOtpExpires.getTime() < Date.now()) {
        throw new BadRequestException('Account deletion OTP has expired');
      }

      if (user.deleteAccountOtp !== dto.otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      const deleteToken = this.generateResetToken();
      const hashedDeleteToken = this.hashToken(deleteToken);
      const deleteTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await this.userRepository.updateById(String(user._id), {
        $set: {
          deleteAccountToken: hashedDeleteToken,
          deleteAccountTokenExpires: deleteTokenExpiry,
        },
        $unset: {
          deleteAccountOtp: 1,
          deleteAccountOtpExpires: 1,
        },
      });

      return {
        verified: true,
        flow: 'account-deletion' as const,
        deleteToken,
        expiresAt: deleteTokenExpiry,
      };
    }

    return {
      verified: true,
      flow: 'email-verification' as const,
      alreadyVerified: true,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      email: dto.email,
      isDeleted: false,
      isActive: true,
    });

    if (!user || user.isBlocked) {
      return {
        message:
          'If an account with that email exists, a password reset OTP has been sent.',
      };
    }

    const resetOtp = this.generateOtp();
    const resetExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    await this.userRepository.updateById(String(user._id), {
      $set: {
        resetPasswordToken: resetOtp,
        resetPasswordExpires: resetExpiry,
      },
      $unset: {
        deleteAccountOtp: 1,
        deleteAccountOtpExpires: 1,
        deleteAccountToken: 1,
        deleteAccountTokenExpires: 1,
      },
    });

    this.queuePasswordResetOtpEmailInBackground({
      to: user.email,
      name: user.name,
      otp: resetOtp,
    });

    return {
      message:
        'If an account with that email exists, a password reset OTP has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedResetToken = this.hashToken(dto.token);
    const user = await this.userRepository.findOne(
      {
        resetPasswordToken: hashedResetToken,
        resetPasswordExpires: { $gt: new Date() },
        isDeleted: false,
        isActive: true,
      },
      '+password',
    );

    if (!user || user.isBlocked) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, getBcryptRounds());

    await this.userRepository.updateById(String(user._id), {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
      },
    });

    return {
      message: 'Password reset successfully',
    };
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user || user.isDeleted || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const deleteOtp = this.generateOtp();
    const deleteOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    await this.userRepository.updateById(String(user._id), {
      $set: {
        deleteAccountOtp: deleteOtp,
        deleteAccountOtpExpires: deleteOtpExpiry,
      },
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
        deleteAccountToken: 1,
        deleteAccountTokenExpires: 1,
      },
    });

    this.queueDeleteAccountOtpEmailInBackground({
      to: user.email,
      name: user.name,
      otp: deleteOtp,
    });

    return {
      message:
        'A verification code has been sent to your email. Verify it to continue with account deletion.',
    };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const hashedDeleteToken = this.hashToken(dto.token);
    const user = await this.userRepository.findOne({
      _id: userId,
      deleteAccountToken: hashedDeleteToken,
      deleteAccountTokenExpires: { $gt: new Date() },
      isDeleted: false,
      isActive: true,
    });

    if (!user || user.isBlocked) {
      throw new BadRequestException(
        'Invalid or expired account deletion token',
      );
    }

    await this.userRepository.deleteById(String(user._id));

    return {
      message: 'Account deleted successfully',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findById(userId, '+password');

    if (!user || user.isDeleted || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const passwordMatches = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from the old password',
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      getBcryptRounds(),
    );

    await this.userRepository.updateById(String(user._id), {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  private generateOtp() {
    return String(randomInt(100000, 1000000));
  }

  private generateResetToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private queueOtpEmailInBackground(payload: {
    to: string;
    name?: string;
    otp: string;
  }) {
    void this.emailQueueService.queueOtpEmail(payload).catch((error: unknown) => {
      const runtimeError =
        error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `Failed to queue signup OTP email for ${payload.to}: ${runtimeError.message}`,
        runtimeError.stack,
      );
    });
  }

  private queuePasswordResetOtpEmailInBackground(payload: {
    to: string;
    name?: string;
    otp: string;
  }) {
    void this.emailQueueService
      .queuePasswordResetOtpEmail(payload)
      .catch((error: unknown) => {
        const runtimeError =
          error instanceof Error ? error : new Error(String(error));

        this.logger.error(
          `Failed to queue password reset OTP email for ${payload.to}: ${runtimeError.message}`,
          runtimeError.stack,
        );
      });
  }

  private queueDeleteAccountOtpEmailInBackground(payload: {
    to: string;
    name?: string;
    otp: string;
  }) {
    void this.emailQueueService
      .queueDeleteAccountOtpEmail(payload)
      .catch((error: unknown) => {
        const runtimeError =
          error instanceof Error ? error : new Error(String(error));

        this.logger.error(
          `Failed to queue account deletion OTP email for ${payload.to}: ${runtimeError.message}`,
          runtimeError.stack,
        );
      });
  }
}
