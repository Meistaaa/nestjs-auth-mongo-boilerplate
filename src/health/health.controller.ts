import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Connection } from 'mongoose';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Get()
  @SkipThrottle()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health status' })
  @ApiOkResponse({
    description: 'Application dependencies are healthy',
  })
  check() {
    return this.health.check([
      () =>
        this.mongoose.pingCheck('mongodb', {
          connection: this.mongoConnection,
          timeout: 1500,
        }),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
