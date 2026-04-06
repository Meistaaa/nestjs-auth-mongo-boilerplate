import { Injectable, NestMiddleware } from '@nestjs/common';
import chalk from 'chalk';
import type { NextFunction, Request, Response } from 'express';
import { AppLogger } from './app.logger';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(RequestLoggerMiddleware.name);
  }

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();
    const { method, originalUrl, params, query } = request;
    const body = request.body as unknown;

    this.logger.log(
      [
        `${chalk.cyanBright(method)} ${chalk.bold.white(originalUrl)}`,
        `${chalk.yellow('params')} ${this.stringify(params)}`,
        `${chalk.magenta('query')} ${this.stringify(query)}`,
        `${chalk.green('body')} ${this.stringify(body)}`,
      ].join('\n'),
    );

    response.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const statusColor =
        response.statusCode >= 500
          ? chalk.redBright
          : response.statusCode >= 400
            ? chalk.yellowBright
            : chalk.greenBright;

      this.logger.log(
        `${statusColor(String(response.statusCode))} ${chalk.dim(
          `${durationMs.toFixed(1)}ms`,
        )}`,
      );
    });

    next();
  }

  private stringify(value: unknown) {
    if (
      value == null ||
      (typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value as Record<string, unknown>).length === 0)
    ) {
      return chalk.dim('{}');
    }

    return chalk.whiteBright(JSON.stringify(value, null, 2));
  }
}
