import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { BoardsModule } from './boards/boards.module.js';
import { StripeModule } from './stripe/stripe.module.js';
import { ChatModule } from './chat/chat.module.js';
import { PusherModule } from './pusher/pusher.module.js';
import { AdminModule } from './admin/admin.module.js';
import { SprintsModule } from './sprints/sprints.module.js';
import { WhiteboardsModule } from './whiteboards/whiteboards.module.js';
import { DiagramsModule } from './diagrams/diagrams.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    BoardsModule,
    SprintsModule,
    WhiteboardsModule,
    DiagramsModule,
    StripeModule,
    ChatModule,
    PusherModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
