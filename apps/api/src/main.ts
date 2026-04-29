import { config } from 'dotenv';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

// Load root .env before anything else — Prisma reads DATABASE_URL
// from process.env directly, before NestJS ConfigModule boots.
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';

/** Kill whatever process is holding `port` (Windows & Unix). */
function killPortHolder(port: number): void {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf8',
      });
      const pids = new Set(
        out
          .trim()
          .split('\n')
          .map((l) => l.trim().split(/\s+/).pop())
          .filter(Boolean),
      );
      for (const pid of pids) {
        if (pid && pid !== String(process.pid)) {
          console.warn(`[api] Killing stale process on port ${port} (PID ${pid})…`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch {
    // nothing to kill — that's fine
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : 'http://localhost:5173',
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
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

  try {
    await app.listen(port);
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
      console.warn(`[api] Port ${port} in use — killing old process and retrying…`);
      killPortHolder(port);
      await new Promise((r) => setTimeout(r, 1000));
      await app.listen(port);
    } else {
      throw err;
    }
  }

  console.log(`[api] listening on http://localhost:${port}/api`);
}
bootstrap();
