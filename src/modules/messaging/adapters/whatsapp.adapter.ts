import { Injectable } from '@nestjs/common';
import type { ChannelAdapter } from './channel-adapter.interface';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp';
  private readonly breaker = new CircuitBreaker('whatsapp', 5, 30_000);

  async send(args: {
    userId: string;
    phone?: string | null;
    email?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{ providerRef: string }> {
    return this.breaker.execute(async () => {
      // Stub: production uses Twilio WhatsApp.
      if (!args.phone) {
        throw new Error('whatsapp adapter: no phone number');
      }
      const providerRef = `wa-${Date.now()}`;
      return { providerRef };
    });
  }
}
