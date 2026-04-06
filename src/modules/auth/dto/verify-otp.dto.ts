import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code' })
  @Transform(({ value }: { value: string }) => value.trim())
  otp: string;
}
