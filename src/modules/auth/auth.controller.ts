import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { Request } from 'express';
import type { Session as ExpressSession } from 'express-session';
import { v7 as uuidv7 } from 'uuid';
import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SessionGuard } from './guards/session.guard';

type SessionWithUserId = ExpressSession & {
  userId?: string;
  sessionId?: string;
};

type SessionRequest = Request & {
  session: Request['session'] & { userId?: string };
};

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
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Session() session: SessionWithUserId) {
    const result = await this.authService.login(dto);

    if ('data' in result && result.data.requiresEmailVerification) {
      return result;
    }

    session.userId = getUserId(
      result as { _id?: { toString(): string } | string },
    );
    session.sessionId = uuidv7();
    await new Promise<void>((resolve, reject) =>
      session.save((err) => (err ? reject(err as Error) : resolve())),
    );
    return result;
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOperation({
    summary: 'Verify a 6-digit email OTP code',
    description:
      'Universal OTP verification endpoint for signup email verification, forgot-password, and account deletion flows.',
  })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  @ApiBadRequestResponse({
    description: 'OTP is missing, expired, or no active OTP exists',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid OTP' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Session() session: SessionWithUserId,
  ) {
    const result = await this.authService.verifyOtp(dto);

    if (result.flow === 'email-verification' && !result.alreadyVerified) {
      session.userId = result.userId;
      session.sessionId = uuidv7();
      await new Promise<void>((resolve, reject) =>
        session.save((err) => (err ? reject(err as Error) : resolve())),
      );
    }

    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOperation({ summary: 'Send a password reset OTP to the user email' })
  @ApiOkResponse({ description: 'Password reset OTP request accepted' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOperation({ summary: 'Reset password using the reset token' })
  @ApiOkResponse({ description: 'Password reset successfully' })
  @ApiBadRequestResponse({ description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('request-account-deletion')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Send an account deletion OTP to the logged-in user email',
  })
  @ApiOkResponse({ description: 'Account deletion OTP request accepted' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  async requestAccountDeletion(@Req() request: SessionRequest) {
    const userId = request.session.userId;

    if (!userId) {
      throw new UnauthorizedException('Login required');
    }

    return this.authService.requestAccountDeletion(userId);
  }

  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Delete the currently logged-in user account using a delete token',
  })
  @ApiOkResponse({ description: 'Account deleted successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid or expired account deletion token',
  })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  async deleteAccount(
    @Req() request: SessionRequest,
    @Session() session: SessionWithUserId,
    @Res() res: Response,
    @Body() dto: DeleteAccountDto,
  ) {
    const userId = request.session.userId;

    if (!userId) {
      throw new UnauthorizedException('Login required');
    }

    const result = await this.authService.deleteAccount(userId, dto);

    session.destroy((err) => {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Account deleted, but failed to clear the current session.',
        });
        return;
      }

      res.clearCookie('sid');
      res.json(result);
    });
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Change password for the currently logged-in user',
  })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiBadRequestResponse({
    description: 'New password is invalid or matches the old password',
  })
  @ApiUnauthorizedResponse({
    description: 'Login required or old password is incorrect',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async changePassword(
    @Req() request: SessionRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    const userId = request.session.userId;

    if (!userId) {
      throw new UnauthorizedException('Login required');
    }

    return this.authService.changePassword(userId, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Logout and destroy the current session' })
  @ApiOkResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Not logged in' })
  logout(@Session() session: SessionWithUserId, @Res() res: Response) {
    session.destroy((err) => {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Failed to logout. Please try again.',
        });
        return;
      }
      res.clearCookie('sid');
      res.json({ message: 'Logged out successfully' });
    });
  }
}
