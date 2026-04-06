import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { buildRedisOptions, getRedisDisplayTarget } from '../redis/redis.util';

const logger = new Logger('BullMQ');

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => {
        logger.log(`Configuring BullMQ for ${getRedisDisplayTarget()}`);

        return {
          connection: buildRedisOptions({
            maxRetriesPerRequest: null,
          }),
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 100,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class BullMqModule {}
