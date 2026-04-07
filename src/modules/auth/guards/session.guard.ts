import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.debug(
      `Session id: ${request.sessionID} | userId: ${request.session?.userId ?? 'MISSING'}`,
    );

    if (!request.session?.userId) {
      throw new UnauthorizedException('Login required');
    }

    return true;
  }
}
