import { customType } from 'drizzle-orm/pg-core';

export const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
  fromDriver(value) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (typeof value === 'string') return Buffer.from(value, 'hex');
    throw new Error(`unexpected bytea driver value: ${typeof value}`);
  },
  toDriver(value: Buffer) {
    return value;
  },
});
