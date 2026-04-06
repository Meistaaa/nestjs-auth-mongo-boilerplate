import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { getRedisConnectionInput, getRedisDisplayTarget } from './redis.util';

const logger = new Logger('Redis');

class RedisLifecycleService implements OnModuleDestroy {
  constructor(private readonly client: Redis) {}

  async onModuleDestroy() {
    await this.client.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async () => {
        const client = new Redis(getRedisConnectionInput());

        logger.log(
          `Initializing Redis connection for ${getRedisDisplayTarget()}`,
        );

        client.on('connect', () => {
          logger.log(`Redis connected: ${getRedisDisplayTarget()}`);
        });
        client.on('ready', () => {
          logger.log('Redis ready');
        });
        client.on('reconnecting', () => {
          logger.warn('Redis reconnecting');
        });
        client.on('end', () => {
          logger.warn('Redis connection closed');
        });
        client.on('error', (error) => {
          logger.error(`Redis error: ${error.message}`, error.stack);
        });

        await client.connect();

        return client;
      },
    },
    {
      provide: RedisLifecycleService,
      inject: [REDIS_CLIENT],
      useFactory: (client: Redis) => new RedisLifecycleService(client),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
