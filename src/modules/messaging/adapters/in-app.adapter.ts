import { Injectable } from '@nestjs/common';
import type { ChannelAdapter } from './channel-adapter.interface';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class InAppAdapter implements ChannelAdapter {
  readonly channel = 'in_app';
  private readonly breaker = new CircuitBreaker('in_app', 5, 30_000);

  async send(args: {
    userId: string;
    phone?: string | null;
    email?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{ providerRef: string }> {
    return this.breaker.execute(async () => {
      // Stub: in dev this is a no-op; the delivery_attempt row is the inbox.
      const providerRef = `inapp-${args.userId}-${Date.now()}`;
      return { providerRef };
    });
  }
}
