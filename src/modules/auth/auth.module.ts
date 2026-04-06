import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  imports: [UserModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
