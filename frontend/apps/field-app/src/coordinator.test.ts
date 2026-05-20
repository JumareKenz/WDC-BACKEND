import { describe, it, expect } from 'vitest';

describe('M11 i18n keys', () => {
  it('has all M11 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'coordinator.overview',
      'coordinator.lgaStats',
      'coordinator.totalReports',
      'coordinator.pendingReview',
      'coordinator.wards',
      'coordinator.queue',
      'coordinator.reviewReport',
      'coordinator.approve',
      'coordinator.return',
      'coordinator.returnNotes',
      'coordinator.confirmApprove',
      'coordinator.confirmReturn',
      'coordinator.sendReminder',
      'coordinator.reminderTo',
      'coordinator.reminderSubject',
      'coordinator.reminderBody',
      'coordinator.reminderSent',
      'coordinator.selectWards',
      'coordinator.allWards',
      'coordinator.myWards',
      'coordinator.needsAttention',
      'coordinator.overdue',
      'coordinator.submittedBy',
      'profile.title',
      'profile.name',
      'profile.role',
      'profile.phone',
      'profile.lga',
      'profile.ward',
      'profile.editProfile',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M11 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'coordinator.overview',
      'coordinator.lgaStats',
      'coordinator.totalReports',
      'coordinator.pendingReview',
      'coordinator.wards',
      'coordinator.queue',
      'coordinator.reviewReport',
      'coordinator.approve',
      'coordinator.return',
      'coordinator.sendReminder',
      'profile.title',
      'profile.name',
      'profile.role',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});

describe('coordinator mock data', () => {
  it('has coordinator user with correct role', async () => {
    const { mockCoordinatorUser } = await import('./lib/mock-coordinator');
    expect(mockCoordinatorUser.role).toBe('coordinator');
    expect(mockCoordinatorUser.fullName).toBeTruthy();
    expect(mockCoordinatorUser.lgaId).toBeTruthy();
  });

  it('has cross-ward reports for coordinator', async () => {
    const { mockCoordinatorReports } = await import('./lib/mock-coordinator');
    expect(mockCoordinatorReports.length).toBeGreaterThan(4);
    const wards = new Set(mockCoordinatorReports.map((r) => r.wardId));
    expect(wards.size).toBeGreaterThan(1);
  });

  it('has reports in all actionable states', async () => {
    const { mockCoordinatorReports } = await import('./lib/mock-coordinator');
    const states = new Set(mockCoordinatorReports.map((r) => r.state));
    expect(states.has('submitted')).toBe(true);
    expect(states.has('in_review')).toBe(true);
    expect(states.has('returned')).toBe(true);
  });

  it('has wards list for coordinator LGA', async () => {
    const { mockWardsForCoordinator } = await import('./lib/mock-coordinator');
    expect(mockWardsForCoordinator.length).toBeGreaterThan(0);
    for (const w of mockWardsForCoordinator) {
      expect(w.reportCount).toBeGreaterThanOrEqual(0);
    }
  });
});
