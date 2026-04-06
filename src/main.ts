import './config/load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import helmet from 'helmet';
import type Redis from 'ioredis';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import {
  applySwaggerDocumentDefaults,
  buildSwaggerConfig,
} from './common/swagger/swagger.util';
import { getServerUrls } from './config/network';
import { AppLogger } from './logger/app.logger';
import { REDIS_CLIENT } from './redis/redis.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(AppLogger);
  const port = Number(process.env.PORT ?? 3000);
  const docsPath = 'docs';
  const isProduction = process.env.ENVIRONMENT === 'production';

  app.useLogger(logger);

  const redisClient = app.get<Redis>(REDIS_CLIENT);

  app.use(
    session({
      store: new RedisStore({ client: redisClient, prefix: 'sess:' }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      name: 'sid',
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = buildSwaggerConfig();
  const swaggerDocument = applySwaggerDocumentDefaults(
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  SwaggerModule.setup(docsPath, app, swaggerDocument);

  await app.listen(port);

  const { currentIp, localhostUrl, networkUrl } = getServerUrls(port);

  logger.log(`Application running on port ${port}`, 'Bootstrap');
  logger.log(`Local URL: ${localhostUrl}`, 'Bootstrap');
  if (networkUrl) {
    logger.log(`Network URL: ${networkUrl}`, 'Bootstrap');
  } else {
    logger.warn(
      'Network URL unavailable: no external IPv4 address found',
      'Bootstrap',
    );
  }
  logger.log(`Current IP: ${currentIp ?? 'unavailable'}`, 'Bootstrap');
  logger.log(`Swagger docs: ${localhostUrl}/${docsPath}`, 'Bootstrap');
  if (networkUrl) {
    logger.log(
      `Swagger docs (network): ${networkUrl}/${docsPath}`,
      'Bootstrap',
    );
  }
}
void bootstrap();
