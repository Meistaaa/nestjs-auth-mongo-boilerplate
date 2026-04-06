import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { PaginationMeta } from '../utils/pagination.util';

interface PaginatedPayload<T> {
  items: T;
  meta: PaginationMeta;
}

function isPaginatedPayload<T>(value: unknown): value is PaginatedPayload<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'items' in value && 'meta' in value;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        if (isPaginatedPayload<T>(data)) {
          return {
            success: true,
            message: 'Request successful',
            data: data.items,
            meta: data.meta,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        return {
          success: true,
          message: 'Request successful',
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
