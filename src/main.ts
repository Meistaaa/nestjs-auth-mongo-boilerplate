import './config/load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import {
  applySwaggerDocumentDefaults,
  buildSwaggerConfig,
} from './common/swagger/swagger.util';
import { getServerUrls } from './config/network';
import { AppLogger } from './logger/app.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(AppLogger);
  const port = Number(process.env.PORT ?? 3000);
  const docsPath = 'docs';

  app.useLogger(logger);
  app.enableCors({
    origin: '*',
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
