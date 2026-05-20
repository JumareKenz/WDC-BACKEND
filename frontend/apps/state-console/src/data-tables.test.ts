import { describe, it, expect } from 'vitest';

describe('M13 i18n keys', () => {
  it('has all M13 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'submissions.title',
      'submissions.filterAll',
      'submissions.filterApproved',
      'submissions.filterPending',
      'submissions.filterReturned',
      'submissions.filterSealed',
      'submissions.searchPlaceholder',
      'submissions.columns.ward',
      'submissions.columns.lga',
      'submissions.columns.secretary',
      'submissions.columns.submittedAt',
      'submissions.columns.status',
      'submissions.columns.method',
      'submissions.sortBy',
      'submissions.empty',
      'submissions.total',
      'investigations.title',
      'investigations.newCase',
      'investigations.columns.caseId',
      'investigations.columns.reportId',
      'investigations.columns.assignedTo',
      'investigations.columns.status',
      'investigations.columns.priority',
      'investigations.columns.openedAt',
      'investigations.status.open',
      'investigations.status.inProgress',
      'investigations.status.resolved',
      'investigations.status.closed',
      'investigations.priority.low',
      'investigations.priority.medium',
      'investigations.priority.high',
      'investigations.priority.critical',
      'investigations.empty',
      'users.title',
      'users.filterAll',
      'users.filterSecretary',
      'users.filterCoordinator',
      'users.filterDirector',
      'users.searchPlaceholder',
      'users.columns.name',
      'users.columns.role',
      'users.columns.phone',
      'users.columns.lga',
      'users.columns.ward',
      'users.columns.status',
      'users.columns.lastActive',
      'users.empty',
      'users.total',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M13 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'submissions.title',
      'investigations.title',
      'users.title',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('mock data tables', () => {
  it('has submissions with valid statuses', async () => {
    const { mockSubmissions } = await import('./lib/mock-data-tables');
    expect(mockSubmissions.length).toBeGreaterThan(0);
    for (const s of mockSubmissions) {
      expect(['approved', 'submitted', 'in_review', 'returned', 'sealed']).toContain(s.status);
      expect(['wizard', 'amira', 'snap']).toContain(s.method);
    }
  });

  it('has investigations with valid priorities', async () => {
    const { mockInvestigations } = await import('./lib/mock-data-tables');
    expect(mockInvestigations.length).toBeGreaterThan(0);
    for (const i of mockInvestigations) {
      expect(['open', 'in_progress', 'resolved', 'closed']).toContain(i.status);
      expect(['low', 'medium', 'high', 'critical']).toContain(i.priority);
    }
  });

  it('has users with valid roles', async () => {
    const { mockUsers } = await import('./lib/mock-data-tables');
    expect(mockUsers.length).toBeGreaterThan(0);
    for (const u of mockUsers) {
      expect(['secretary', 'coordinator', 'director']).toContain(u.role);
      expect(['active', 'suspended']).toContain(u.status);
    }
  });

  it('has at least one director, coordinator, and secretary', async () => {
    const { mockUsers } = await import('./lib/mock-data-tables');
    const roles = new Set(mockUsers.map((u) => u.role));
    expect(roles.has('secretary')).toBe(true);
    expect(roles.has('coordinator')).toBe(true);
    expect(roles.has('director')).toBe(true);
  });
});
