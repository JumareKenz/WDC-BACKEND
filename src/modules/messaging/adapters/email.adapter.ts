import { Injectable } from '@nestjs/common';
import type { ChannelAdapter } from './channel-adapter.interface';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class EmailAdapter implements ChannelAdapter {
  readonly channel = 'email';
  private readonly breaker = new CircuitBreaker('email', 5, 30_000);

  async send(args: {
    userId: string;
    phone?: string | null;
    email?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{ providerRef: string }> {
    return this.breaker.execute(async () => {
      // Stub: production uses Postmark/SES.
      if (!args.email) {
        throw new Error('email adapter: no email address');
      }
      const providerRef = `email-${Date.now()}`;
      return { providerRef };
    });
  }
}
