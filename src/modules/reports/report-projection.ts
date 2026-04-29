/**
 * Pure functions that derive a report's canonical state from its append-only
 * op log. The function is order-independent: shuffling the input array yields
 * the same output, because operations are sorted on (wall_clock_ts, op_id)
 * before being applied. This is the property the M6 fast-check test pins.
 *
 * The op log is the source of truth. `reports.canonical` is just a cached
 * projection — it can always be reconstructed from the log.
 */

export type FieldSource = 'typed' | 'voiced' | 'scanned';

export interface FieldSetPayload {
  key: string;
  value: unknown;
  source: FieldSource;
  /** 0..1 confidence; null when unknown (e.g. typed input) */
  confidence: number | null;
}

export interface AttachmentAddPayload {
  attachment_id: string;
  kind: 'audio' | 'image' | 'document';
}

export type OpKind =
  | 'field_set'
  | 'attachment_add'
  | 'submit'
  | 'open_review'
  | 'approve'
  | 'return'
  | 'seal';

export interface ReportOp {
  opId: string; // UUIDv7
  opKind: OpKind;
  payload: Record<string, unknown>;
  wallClockTs: string; // ISO-8601
  // server_seq is for sync cursor; not part of canonical projection.
}

export interface CanonicalField {
  value: unknown;
  source: FieldSource;
  confidence: number | null;
  /** op_id of the winning op, for audit traceability */
  setBy: string;
}

export interface CanonicalReport {
  fields: Record<string, CanonicalField>;
  attachments: string[];
  notes: string[];
}

const ZERO: CanonicalReport = { fields: {}, attachments: [], notes: [] };

/**
 * Project the op log to a canonical state. Order-independent: ops are sorted
 * by (wall_clock_ts asc, op_id asc) before being applied. For two field_set
 * ops on the same field with identical wall_clock_ts, the larger op_id wins
 * — which is the UUIDv7-encoded "later" of the two on the originating device.
 */
export function projectCanonical(ops: ReadonlyArray<ReportOp>): CanonicalReport {
  if (ops.length === 0) return { fields: {}, attachments: [], notes: [] };
  const sorted = [...ops].sort(compareOps);
  const out: CanonicalReport = { fields: {}, attachments: [], notes: [] };
  for (const op of sorted) {
    switch (op.opKind) {
      case 'field_set': {
        const p = op.payload as unknown as FieldSetPayload;
        out.fields[p.key] = {
          value: p.value,
          source: p.source,
          confidence: p.confidence,
          setBy: op.opId,
        };
        break;
      }
      case 'attachment_add': {
        const p = op.payload as unknown as AttachmentAddPayload;
        if (!out.attachments.includes(p.attachment_id)) {
          out.attachments.push(p.attachment_id);
        }
        break;
      }
      case 'return': {
        const note = (op.payload as { notes?: unknown }).notes;
        if (typeof note === 'string' && note.length > 0) {
          out.notes.push(note);
        }
        break;
      }
      // submit / open_review / approve / seal are state transitions — they
      // change `reports.state` but don't contribute to the canonical content.
      default:
        break;
    }
  }
  return out;
}

function compareOps(a: ReportOp, b: ReportOp): number {
  if (a.wallClockTs !== b.wallClockTs) return a.wallClockTs < b.wallClockTs ? -1 : 1;
  if (a.opId !== b.opId) return a.opId < b.opId ? -1 : 1;
  return 0;
}

/* -------------------------------------------------------------------------
 * State machine
 * ------------------------------------------------------------------------- */

export type ReportState = 'draft' | 'submitted' | 'in_review' | 'approved' | 'returned' | 'sealed';

export type Transition = 'submit' | 'open_review' | 'approve' | 'return' | 'edit_returned' | 'seal';

const TRANSITIONS: Record<Transition, { from: ReportState; to: ReportState }> = {
  submit: { from: 'draft', to: 'submitted' },
  open_review: { from: 'submitted', to: 'in_review' },
  approve: { from: 'in_review', to: 'approved' },
  return: { from: 'in_review', to: 'returned' },
  edit_returned: { from: 'returned', to: 'draft' },
  seal: { from: 'approved', to: 'sealed' },
};

export function nextState(transition: Transition): ReportState {
  return TRANSITIONS[transition].to;
}

export function expectedFromState(transition: Transition): ReportState {
  return TRANSITIONS[transition].from;
}

/** Roles permitted to drive a given transition. */
export function rolesForTransition(transition: Transition): ReadonlyArray<'secretary' | 'coordinator' | 'director' | 'system'> {
  switch (transition) {
    case 'submit':
    case 'edit_returned':
      return ['secretary', 'director'];
    case 'open_review':
    case 'approve':
    case 'return':
      return ['coordinator', 'director'];
    case 'seal':
      return ['system'];
  }
}

/** True if the current state allows raw content edits (field_set / attachment_add). */
export function isEditable(state: ReportState): boolean {
  return state === 'draft' || state === 'returned';
}

export const __test__ = { compareOps, ZERO };
