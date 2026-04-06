import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Session,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Session as ExpressSession } from 'express-session';
import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

type SessionWithUserId = ExpressSession & { userId?: string };

function getUserId(user: { _id?: { toString(): string } | string }) {
  if (!user._id) {
    return '';
  }

  return typeof user._id === 'string' ? user._id : user._id.toString();
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @AuthThrottle()
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({ description: 'User registered successfully' })
  @ApiConflictResponse({ description: 'Email is already in use' })
  async signUp(@Body() dto: SignUpDto, @Session() session: SessionWithUserId) {
    const result = await this.authService.signUp(dto);
    session.userId = getUserId(
      result.data.user as { _id?: { toString(): string } | string },
    );
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Session() session: SessionWithUserId) {
    const user = await this.authService.login(dto);

    await new Promise<void>((resolve, reject) =>
      session.regenerate((err) => (err ? reject(err as Error) : resolve())),
    );

    session.userId = getUserId(
      user as { _id?: { toString(): string } | string },
    );
    return user;
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOperation({
    summary: 'Verify a 6-digit email OTP code',
    description:
      'Universal email OTP verification endpoint for signup and other email verification screens.',
  })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  @ApiBadRequestResponse({
    description: 'OTP is missing, expired, or no active OTP exists',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid OTP' })
  @ApiNotFoundResponse({ description: 'User not found' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
}
