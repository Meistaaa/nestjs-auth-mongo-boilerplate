// src/database/database.module.ts
import '../config/load-env';
import { Global, Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

const logger = new Logger('MongoDB');

function getMongoTarget(uri: string, dbName: string) {
  const sanitizedUri = uri.replace(/^mongodb(\+srv)?:\/\//, '');
  const authority = sanitizedUri.split('/')[0] ?? '';
  const hosts = authority.split('@').pop();

  return hosts ? `${hosts}/${dbName}` : dbName;
}

@Global() // 👈 makes it available everywhere (no need to import again)
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGO_URI;
        const dbName = process.env.DB_NAME || 'app_db';

        if (!uri) {
          logger.error('MONGO_URI is not set');
        } else {
          logger.log(
            `Initializing MongoDB connection for ${getMongoTarget(uri, dbName)}`,
          );
        }
        return {
          uri,
          dbName,
          retryAttempts: 3,
          retryDelay: 1000,
          verboseRetryLog: true,
          connectionErrorFactory: (error) => {
            logger.error(
              `MongoDB connection failed: ${error.message}`,
              error.stack,
            );
            return error;
          },
          onConnectionCreate: (connection) => {
            const connectedDbName = connection.name || dbName;

            logger.log(
              `MongoDB connected: ${getMongoTarget(uri ?? '', connectedDbName)}`,
            );
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });
            connection.on('reconnected', () => {
              logger.log('MongoDB reconnected');
            });
            connection.on('error', (error: unknown) => {
              const runtimeError =
                error instanceof Error ? error : new Error(String(error));

              logger.error(
                `MongoDB runtime error: ${runtimeError.message}`,
                runtimeError.stack,
              );
            });
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
