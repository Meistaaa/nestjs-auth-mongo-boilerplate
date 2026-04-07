import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset_token_from_verify_step' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  token: string;

  @ApiProperty({ example: 'strongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
