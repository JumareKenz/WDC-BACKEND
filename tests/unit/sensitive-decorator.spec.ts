import { describe, it, expect } from 'vitest';
import { Sensitive, getSensitiveFields } from '../../src/common/decorators/sensitive.decorator';

class Subject {
  @Sensitive() phone!: string;
  @Sensitive() email!: string;
  publicName!: string;
}

class Empty {
  publicOnly!: string;
}

describe('@Sensitive decorator', () => {
  it('records each tagged property name', () => {
    const fields = getSensitiveFields(new Subject());
    expect(new Set(fields)).toEqual(new Set(['phone', 'email']));
  });

  it('returns an empty list when no fields are tagged', () => {
    expect(getSensitiveFields(new Empty())).toEqual([]);
  });
});
