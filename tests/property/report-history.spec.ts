/**
 * Property test: shuffle-invariance of the canonical projection.
 *
 * Per the prompt: "same operations applied in any order yield the same
 * canonical report state". This is the core CRDT-style guarantee that lets
 * mobile clients replay ops in arbitrary received-order without diverging.
 *
 * We generate a random list of field_set + attachment_add + return ops with
 * client-supplied (wallClockTs, opId) pairs, then project the same list in
 * its original order and in a shuffled order. The two projections must be
 * structurally equal.
 */
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  projectCanonical,
  type ReportOp,
} from '../../src/modules/reports/report-projection';

function shuffle<T>(arr: ReadonlyArray<T>, seed: number): T[] {
  const out = [...arr];
  // Fisher-Yates with a deterministic mulberry32 seeded by `seed`.
  let s = seed >>> 0;
  const rng = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const fieldKey = fc.constantFrom('a', 'b', 'c', 'd', 'e', 'household_count', 'water_source');

const fieldSetOp: fc.Arbitrary<ReportOp> = fc
  .record({
    opId: fc.uuid(),
    wallClockTs: fc
      .integer({ min: 0, max: 1_000_000 })
      .map((ms) => new Date(1_745_000_000_000 + ms).toISOString()),
    key: fieldKey,
    value: fc.oneof(fc.integer(), fc.string({ maxLength: 16 }), fc.boolean()),
    source: fc.constantFrom('typed', 'voiced', 'scanned'),
    confidence: fc.option(fc.float({ min: 0, max: 1, noNaN: true })),
  })
  .map(
    ({ opId, wallClockTs, key, value, source, confidence }): ReportOp => ({
      opId,
      opKind: 'field_set',
      wallClockTs,
      payload: { key, value, source, confidence: confidence ?? null },
    }),
  );

const attachmentOp: fc.Arbitrary<ReportOp> = fc
  .record({
    opId: fc.uuid(),
    wallClockTs: fc
      .integer({ min: 0, max: 1_000_000 })
      .map((ms) => new Date(1_745_000_000_000 + ms).toISOString()),
    attachment_id: fc.uuid(),
    kind: fc.constantFrom('audio', 'image', 'document'),
  })
  .map(
    ({ opId, wallClockTs, attachment_id, kind }): ReportOp => ({
      opId,
      opKind: 'attachment_add',
      wallClockTs,
      payload: { attachment_id, kind },
    }),
  );

const returnOp: fc.Arbitrary<ReportOp> = fc
  .record({
    opId: fc.uuid(),
    wallClockTs: fc
      .integer({ min: 0, max: 1_000_000 })
      .map((ms) => new Date(1_745_000_000_000 + ms).toISOString()),
    notes: fc.string({ minLength: 1, maxLength: 32 }),
  })
  .map(
    ({ opId, wallClockTs, notes }): ReportOp => ({
      opId,
      opKind: 'return',
      wallClockTs,
      payload: { notes },
    }),
  );

describe('property: projectCanonical is shuffle-invariant', () => {
  it('same ops, any order → same canonical state (1000 cases)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fieldSetOp, attachmentOp, returnOp), { minLength: 0, maxLength: 50 }),
        fc.integer(),
        (ops, seed) => {
          const a = projectCanonical(ops);
          const b = projectCanonical(shuffle(ops, seed));
          // Sort attachments + notes are intrinsically ordered by sorted ops,
          // not by input order — direct equality should hold.
          return JSON.stringify(a) === JSON.stringify(b);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
