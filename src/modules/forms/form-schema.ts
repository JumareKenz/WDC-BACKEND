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
 *
 * Optional per-field extensions (all backward-compatible — old deployed
 * versions without these keys remain valid; old reports simply won't have
 * the corresponding data):
 *
 *   voice      — Amira reads these questions aloud and maps the spoken
 *                answer back to this field. Both EN and HA required so
 *                either locale works in voice mode.
 *   ocr        — Snap mode scans printed forms; patterns (regex) and
 *                keywords guide which region maps to this field.
 *   validation — Extra client-side constraints applied before submission.
 *   conditions — Show/hide this field based on another field's current
 *                value. Evaluated in dependency order by the app.
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

// ---------------------------------------------------------------------------
// Per-field optional extensions
// ---------------------------------------------------------------------------

const VoiceConfig = z.object({
  question_en: z.string().min(1).max(500).optional(),
  question_ha: z.string().min(1).max(500).optional(),
});

const OcrConfig = z.object({
  // Regexes applied to OCR-extracted text to isolate the value for this field.
  patterns: z.array(z.string().min(1).max(200)).max(20).optional(),
  // Nearby printed keywords that anchor the field's location on the page.
  keywords: z.array(z.string().min(1).max(100)).max(20).optional(),
});

const ValidationRules = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  min_length: z.number().int().nonnegative().optional(),
  max_length: z.number().int().positive().optional(),
  regex: z.string().max(500).optional(),
  regex_message_en: z.string().max(200).optional(),
  regex_message_ha: z.string().max(200).optional(),
});

const ConditionRule = z.object({
  field: FieldKey,
  op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const Conditions = z.object({
  match: z.enum(['all', 'any']).default('all'),
  rules: z.array(ConditionRule).min(1).max(10),
});

// Mixin merged into every concrete field type.
const Extensions = z.object({
  voice: VoiceConfig.optional(),
  ocr: OcrConfig.optional(),
  validation: ValidationRules.optional(),
  conditions: Conditions.optional(),
});

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

const Common = z.object({
  key: FieldKey,
  required: z.boolean().default(false),
});

const TextField = Common.merge(Labels).merge(Extensions).extend({
  type: z.literal('text'),
  multiline: z.boolean().default(false),
  max_length: z.number().int().positive().max(10_000).optional(),
});

const NumberField = Common.merge(Labels).merge(Extensions).extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  decimals: z.number().int().min(0).max(6).default(0),
});

const DateField = Common.merge(Labels).merge(Extensions).extend({
  type: z.literal('date'),
});

const SelectField = Common.merge(Labels).merge(Extensions).extend({
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

const CheckboxField = Common.merge(Labels).merge(Extensions).extend({
  type: z.literal('checkbox'),
});

const PhotoField = Common.merge(Labels).merge(Extensions).extend({
  type: z.literal('photo'),
  max_count: z.number().int().min(1).max(20).default(1),
});

const AudioField = Common.merge(Labels).merge(Extensions).extend({
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
export type VoiceConfig = z.infer<typeof VoiceConfig>;
export type OcrConfig = z.infer<typeof OcrConfig>;
export type ValidationRules = z.infer<typeof ValidationRules>;
export type ConditionRule = z.infer<typeof ConditionRule>;
export type Conditions = z.infer<typeof Conditions>;

// ---------------------------------------------------------------------------
// Section + top-level schema
// ---------------------------------------------------------------------------

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
    const seenSections = new Set<string>();
    // Collect all field keys across sections for condition validation.
    const allFieldKeys = new Set<string>();
    for (const section of schema.sections) {
      for (const field of section.fields) {
        allFieldKeys.add(field.key);
      }
    }

    for (const section of schema.sections) {
      if (seenSections.has(section.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate section key: ${section.key}`,
          path: ['sections'],
        });
      }
      seenSections.add(section.key);

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

        // Validate that condition rules reference existing field keys.
        if (field.conditions) {
          for (const rule of field.conditions.rules) {
            if (!allFieldKeys.has(rule.field)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `condition on field "${field.key}" references unknown field "${rule.field}"`,
                path: ['sections', section.key, 'fields', field.key, 'conditions'],
              });
            }
            // A field cannot condition on itself.
            if (rule.field === field.key) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `field "${field.key}" cannot condition on itself`,
                path: ['sections', section.key, 'fields', field.key, 'conditions'],
              });
            }
          }
        }
      }
    }
  });

export type FormSchema = z.infer<typeof FormSchemaJson>;

export function parseFormSchema(input: unknown): FormSchema {
  return FormSchemaJson.parse(input);
}
