import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'strongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
