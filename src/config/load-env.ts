import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';

const environment = process.env.ENVIRONMENT;

const envFile = environment === 'production' ? '.env' : '.env.local';

const filePath = join(process.cwd(), envFile);

if (existsSync(filePath)) {
  loadEnvFile(filePath);
}
