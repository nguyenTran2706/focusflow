import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { BoardsModule } from './boards/boards.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env', // Catches apps/api/.env if run from apps/api, OR root .env if run from root
        '../../.env', // Catches root .env if run from apps/api
        'apps/api/.env', // Catches apps/api/.env if run from root
      ],
    }),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    BoardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
