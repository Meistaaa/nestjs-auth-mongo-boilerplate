import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionGuard } from '../auth/guards/session.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

type SessionRequest = Request & {
  session: Request['session'] & { userId?: string };
};

@ApiTags('Users')
@ApiCookieAuth('session')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Get the currently logged-in user' })
  @ApiOkResponse({ description: 'Current user returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  async getMe(@Req() request: SessionRequest) {
    const userId = request.session.userId;

    if (!userId) {
      throw new UnauthorizedException('Login required');
    }

    return this.userService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid profile payload' })
  @ApiUnauthorizedResponse({ description: 'Login required' })
  async updateMe(
    @Req() request: SessionRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = request.session.userId;

    if (!userId) {
      throw new UnauthorizedException('Login required');
    }

    return this.userService.updateMe(userId, dto);
  }
}
