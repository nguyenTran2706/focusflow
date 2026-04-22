import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

@Injectable()
export class PusherService {
  private pusher: Pusher;

  constructor(private readonly config: ConfigService) {
    this.pusher = new Pusher({
      appId: this.config.get<string>('PUSHER_APP_ID') ?? '',
      key: this.config.get<string>('PUSHER_KEY') ?? '',
      secret: this.config.get<string>('PUSHER_SECRET') ?? '',
      cluster: this.config.get<string>('PUSHER_CLUSTER') ?? 'ap4',
      useTLS: true,
    });
  }

  /** Trigger an event on a channel */
  async trigger(channel: string, event: string, data: unknown) {
    try {
      await this.pusher.trigger(channel, event, data);
    } catch {
      // Silently fail if Pusher is not configured
    }
  }

  /** Authenticate a private channel subscription */
  authorizeChannel(socketId: string, channelName: string, userId?: string) {
    return this.pusher.authorizeChannel(socketId, channelName, {
      user_id: userId ?? 'anonymous',
    });
  }
}
