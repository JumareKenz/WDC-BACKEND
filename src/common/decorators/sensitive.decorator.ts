import 'reflect-metadata';

export const SENSITIVE_FIELDS_METADATA = Symbol('wdc:sensitive-fields');

/**
 * Marks a property as containing PII. Logging middleware reads this metadata
 * via reflection and strips the field from log payloads. Never log a
 * @Sensitive() field, even in error paths.
 */
export function Sensitive(): PropertyDecorator {
  return (target, propertyKey) => {
    const existing: string[] =
      Reflect.getMetadata(SENSITIVE_FIELDS_METADATA, target.constructor) ?? [];
    Reflect.defineMetadata(
      SENSITIVE_FIELDS_METADATA,
      [...existing, String(propertyKey)],
      target.constructor,
    );
  };
}

export function getSensitiveFields(target: object): readonly string[] {
  const ctor = (target as { constructor: object }).constructor;
  return (Reflect.getMetadata(SENSITIVE_FIELDS_METADATA, ctor) as string[] | undefined) ?? [];
}
