import type { RedisOptions } from 'ioredis';

export interface RedisConnectionConfig {
  url?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getRedisConnectionConfig(): RedisConnectionConfig {
  return {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseNumber(process.env.REDIS_PORT, 6379),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseNumber(process.env.REDIS_DB, 0),
  };
}

export function buildRedisOptions(
  extraOptions: RedisOptions = {},
): RedisOptions {
  const config = getRedisConnectionConfig();

  if (config.url) {
    const parsedUrl = new URL(config.url);

    return {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : 6379,
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      db: parsedUrl.pathname ? parseNumber(parsedUrl.pathname.slice(1), 0) : 0,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
      lazyConnect: true,
      ...extraOptions,
    };
  }

  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.db,
    lazyConnect: true,
    ...extraOptions,
  };
}

export function getRedisConnectionInput(extraOptions: RedisOptions = {}) {
  const config = getRedisConnectionConfig();

  if (config.url) {
    return buildRedisOptions(extraOptions);
  }

  return buildRedisOptions(extraOptions);
}

export function getRedisDisplayTarget() {
  const config = getRedisConnectionConfig();

  if (config.url) {
    const sanitizedUrl = config.url.replace(/^redis(s)?:\/\//, '');
    const authority = sanitizedUrl.split('/')[0] ?? '';
    const host = authority.split('@').pop();

    return host ?? 'redis';
  }

  return `${config.host}:${config.port}/${config.db}`;
}
