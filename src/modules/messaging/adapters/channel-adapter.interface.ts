export interface ChannelAdapter {
  readonly channel: string;
  send(args: {
    userId: string;
    phone?: string | null;
    email?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{ providerRef: string }>;
}
