import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const result = await this.redisClient.ping();

      if (result !== 'PONG') {
        throw new Error(`Unexpected ping response: ${String(result)}`);
      }

      return indicator.up();
    } catch (error) {
      const healthResult = indicator.down({
        message: error instanceof Error ? error.message : 'Redis ping failed',
      });

      throw new HealthCheckError('Redis health check failed', healthResult);
    }
  }
}
