import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

function toNumber(value: unknown, fallback: number) {
  const transformed = Number(value);

  return Number.isFinite(transformed) ? transformed : fallback;
}

export class PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => toNumber(value, 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => toNumber(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
