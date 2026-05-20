import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('M14 i18n keys', () => {
  it('has all M14 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'lga.title',
      'lga.backToDashboard',
      'lga.wards',
      'lga.reportsByWard',
      'lga.submissionTrend',
      'lga.approvalRate',
      'lga.avgResponseTime',
      'review.title',
      'review.reportId',
      'review.submittedBy',
      'review.submittedAt',
      'review.meetingDate',
      'review.attendance',
      'review.agendaItems',
      'review.summary',
      'review.approve',
      'review.return',
      'review.returnNotes',
      'review.viewOriginal',
      'review.history',
      'review.history.submitted',
      'review.history.openedReview',
      'review.history.approved',
      'review.history.returned',
      'investigationDetail.title',
      'investigationDetail.caseId',
      'investigationDetail.reportRef',
      'investigationDetail.assignedTo',
      'investigationDetail.openedAt',
      'investigationDetail.description',
      'investigationDetail.timeline',
      'investigationDetail.timeline.opened',
      'investigationDetail.timeline.assigned',
      'investigationDetail.timeline.updated',
      'investigationDetail.timeline.note',
      'investigationDetail.addNote',
      'investigationDetail.closeCase',
      'investigationDetail.reopen',
      'assignSecretary.title',
      'assignSecretary.selectLga',
      'assignSecretary.selectWard',
      'assignSecretary.name',
      'assignSecretary.phone',
      'assignSecretary.email',
      'assignSecretary.confirm',
      'assignSecretary.success',
      'assignSecretary.error',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M14 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'lga.title',
      'review.title',
      'investigationDetail.title',
      'assignSecretary.title',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('M14 page files exist', () => {
  const root = path.resolve(__dirname, '..');

  it('has LGA drilldown page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'lga', '[id]', 'page.tsx'))).toBe(true);
  });

  it('has review page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'review', '[id]', 'page.tsx'))).toBe(true);
  });

  it('has investigation detail page', () => {
    expect(fs.existsSync(path.join(root, 'app', 'investigations', '[id]', 'page.tsx'))).toBe(true);
  });

  it('has AssignSecretaryModal component', () => {
    expect(fs.existsSync(path.join(root, 'src', 'components', 'AssignSecretaryModal.tsx'))).toBe(true);
  });
});
