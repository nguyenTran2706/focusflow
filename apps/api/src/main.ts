import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load root .env before anything else — Prisma reads DATABASE_URL
// from process.env directly, before NestJS ConfigModule boots.
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}/api`);
}
bootstrap();
