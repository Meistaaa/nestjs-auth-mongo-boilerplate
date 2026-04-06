import type { Model, ProjectionType, QueryOptions } from 'mongoose';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginateOptions<T extends object> {
  filter?: Record<string, unknown>;
  projection?: ProjectionType<T>;
  options?: QueryOptions<T>;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function getPaginationParams(query: PaginationQueryDto) {
  const page = Math.max(1, query.page);
  const limit = Math.max(1, Math.min(query.limit, 100));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export async function paginateModel<T extends object>(
  model: Model<T>,
  query: PaginationQueryDto,
  paginateOptions: PaginateOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const filter = paginateOptions.filter ?? {};
  const projection = paginateOptions.projection ?? null;
  const options = paginateOptions.options ?? {};
  const { page, limit, skip } = getPaginationParams(query);

  const [items, total] = await Promise.all([
    model
      .find(filter, projection, {
        ...options,
        skip,
        limit,
      })
      .lean()
      .exec() as Promise<T[]>,
    model.countDocuments(filter),
  ]);

  return {
    items,
    meta: buildPaginationMeta(page, limit, total),
  };
}
