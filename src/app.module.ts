import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { BullMqModule } from './queue/bullmq.module';
import { RedisModule } from './redis/redis.module';
import { AppLogger } from './logger/app.logger';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    BullMqModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: minutes(1),
        limit: 100,
      },
    ]),
  ],
  controllers: [],
  providers: [
    AppLogger,
    RequestLoggerMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
