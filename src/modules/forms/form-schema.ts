import { z } from 'zod';

/**
 * The JSON shape stored in `form_versions.schema`. Validated on every
 * version create. Once a version is deployed, the trigger
 * `wdc_form_versions_immutable` (in 0001_init.sql) prevents UPDATE/DELETE
 * — so historical reports remain interpretable forever against the exact
 * schema they were filled against.
 *
 * Every field carries `label_en` AND `label_ha` as a first-class property.
 * The mobile app picks the label by the user's locale; both labels are
 * always present in storage.
 */

const FieldKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'field key must be snake_case starting with a letter');

const Labels = z.object({
  label_en: z.string().min(1).max(200),
  label_ha: z.string().min(1).max(200),
  help_en: z.string().max(500).optional(),
  help_ha: z.string().max(500).optional(),
});

const Common = z.object({
  key: FieldKey,
  required: z.boolean().default(false),
});

const TextField = Common.merge(Labels).extend({
  type: z.literal('text'),
  multiline: z.boolean().default(false),
  max_length: z.number().int().positive().max(10_000).optional(),
});

const NumberField = Common.merge(Labels).extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  decimals: z.number().int().min(0).max(6).default(0),
});

const DateField = Common.merge(Labels).extend({
  type: z.literal('date'),
});

const SelectField = Common.merge(Labels).extend({
  type: z.literal('select'),
  multiple: z.boolean().default(false),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(64),
        label_en: z.string().min(1).max(200),
        label_ha: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(100),
});

const CheckboxField = Common.merge(Labels).extend({
  type: z.literal('checkbox'),
});

const PhotoField = Common.merge(Labels).extend({
  type: z.literal('photo'),
  max_count: z.number().int().min(1).max(20).default(1),
});

const AudioField = Common.merge(Labels).extend({
  type: z.literal('audio'),
  max_seconds: z.number().int().min(5).max(600).default(120),
});

const Field = z.discriminatedUnion('type', [
  TextField,
  NumberField,
  DateField,
  SelectField,
  CheckboxField,
  PhotoField,
  AudioField,
]);

export type FormField = z.infer<typeof Field>;

const Section = z.object({
  key: FieldKey,
  label_en: z.string().min(1).max(200),
  label_ha: z.string().min(1).max(200),
  fields: z.array(Field).min(1).max(50),
});

export const FormSchemaJson = z
  .object({
    version: z.literal(1),
    sections: z.array(Section).min(1).max(20),
  })
  .superRefine((schema, ctx) => {
    const seen = new Set<string>();
    for (const section of schema.sections) {
      if (seen.has(section.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate section key: ${section.key}`,
          path: ['sections'],
        });
      }
      seen.add(section.key);
      const fieldKeys = new Set<string>();
      for (const field of section.fields) {
        if (fieldKeys.has(field.key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `duplicate field key in section ${section.key}: ${field.key}`,
            path: ['sections', section.key, 'fields'],
          });
        }
        fieldKeys.add(field.key);
      }
    }
  });

export type FormSchema = z.infer<typeof FormSchemaJson>;

export function parseFormSchema(input: unknown): FormSchema {
  return FormSchemaJson.parse(input);
}
