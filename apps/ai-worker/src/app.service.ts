import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return { status: 'ok', service: 'ai-worker', timestamp: new Date().toISOString() };
  }
}
