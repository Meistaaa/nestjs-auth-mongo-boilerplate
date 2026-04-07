import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  name?: string;

  @ApiPropertyOptional({ example: '12 Palm Street, Lagos' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  address?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'https://dummyimage.com/400x400/e5e7eb/6b7280&text=Profile',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  profilePicture?: string;
}
