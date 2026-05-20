import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadDraft, saveDraft, clearDraft } from './hooks/useDraftAutosave';
import { getQueue, addToQueue, removeFromQueue, getPendingCount } from './hooks/useOfflineQueue';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    multiGet: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

describe('draft autosave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no draft exists', async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const draft = await loadDraft('fv-1');
    expect(draft).toBeNull();
  });

  it('saves and loads a draft', async () => {
    const values = { meeting_date: '2024-06-15', attendance: 45 };
    await saveDraft('fv-1', values);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const callArgs = (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(callArgs[0]).toContain('wdc:draft:fv-1');
    const saved = JSON.parse(callArgs[1]);
    expect(saved.values).toEqual(values);
    expect(saved.formVersionId).toBe('fv-1');
    expect(saved.lastSavedAt).toBeTruthy();
  });

  it('clears a draft', async () => {
    await clearDraft('fv-1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(expect.stringContaining('wdc:draft:fv-1'));
  });
});

describe('offline queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty queue initially', async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const queue = await getQueue();
    expect(queue).toEqual([]);
  });

  it('adds item to queue', async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('[]');
    await addToQueue({
      id: 'q-1',
      reportId: 'rpt-1',
      formVersionId: 'fv-1',
      wardId: 'ward-1',
      values: { x: 1 },
      submittedAt: '2024-06-15T00:00:00Z',
    });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const callArgs = (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const queue = JSON.parse(callArgs[1]);
    expect(queue).toHaveLength(1);
    expect(queue[0].attemptCount).toBe(0);
    expect(queue[0].id).toBe('q-1');
  });

  it('removes item from queue', async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify([{ id: 'q-1' }, { id: 'q-2' }])
    );
    await removeFromQueue('q-1');
    const callArgs = (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const queue = JSON.parse(callArgs[1]);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('q-2');
  });

  it('counts pending items', async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify([{ id: 'q-1' }, { id: 'q-2' }])
    );
    const count = await getPendingCount();
    expect(count).toBe(2);
  });
});

describe('M8 i18n keys', () => {
  it('has all M8 keys in en', async () => {
    const { enMessages } = await import('../../../packages/i18n/src/locales/en');
    const required = [
      'wizard.title',
      'wizard.step',
      'wizard.next',
      'wizard.back',
      'wizard.submit',
      'wizard.draftSaved',
      'wizard.required',
      'offline.banner',
      'offline.pending',
      'offline.syncNow',
    ];
    for (const key of required) {
      expect(enMessages[key as keyof typeof enMessages]).toBeDefined();
    }
  });

  it('has all M8 keys in ha', async () => {
    const { haMessages } = await import('../../../packages/i18n/src/locales/ha');
    const required = [
      'wizard.title',
      'wizard.step',
      'wizard.next',
      'wizard.back',
      'wizard.submit',
      'wizard.draftSaved',
      'wizard.required',
      'offline.banner',
      'offline.pending',
      'offline.syncNow',
    ];
    for (const key of required) {
      expect(haMessages[key as keyof typeof haMessages]).toBeDefined();
    }
  });
});
