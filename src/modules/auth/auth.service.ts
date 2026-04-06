import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { EmailQueueService } from '../email/email-queue.service';
import { UserRepository } from '../user/user.repository';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
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
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await this.userRepository.updateById(String(existingUser._id), {
        $set: {
          emailVerificationToken: verificationOtp,
          emailVerificationExpires: verificationExpiry,
        },
      });

      await this.emailQueueService.queueOtpEmail({
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

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const verificationOtp = this.generateOtp();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      emailVerificationToken: verificationOtp,
      emailVerificationExpires: verificationExpiry,
    });

    await this.emailQueueService.queueOtpEmail({
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

    if (user.isEmailVerified) {
      return {
        verified: true,
        alreadyVerified: true,
      };
    }

    if (!user.emailVerificationToken || !user.emailVerificationExpires) {
      throw new BadRequestException('No active OTP found for this user');
    }

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
      alreadyVerified: false,
    };
  }

  private generateOtp() {
    return String(randomInt(100000, 1000000));
  }
}
