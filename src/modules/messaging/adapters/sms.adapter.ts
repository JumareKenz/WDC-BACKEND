import { Injectable } from '@nestjs/common';
import type { ChannelAdapter } from './channel-adapter.interface';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class SmsAdapter implements ChannelAdapter {
  readonly channel = 'sms';
  private readonly breaker = new CircuitBreaker('sms', 5, 30_000);

  async send(args: {
    userId: string;
    phone?: string | null;
    email?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{ providerRef: string }> {
    return this.breaker.execute(async () => {
      // Stub: production uses Termii or AWS SNS.
      if (!args.phone) {
        throw new Error('sms adapter: no phone number');
      }
      const providerRef = `sms-${Date.now()}`;
      return { providerRef };
    });
  }
}
