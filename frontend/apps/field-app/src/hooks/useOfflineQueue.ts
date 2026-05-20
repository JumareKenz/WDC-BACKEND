import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'wdc:offlineQueue';

export interface QueuedSubmission {
  id: string;
  reportId: string;
  formVersionId: string;
  wardId: string;
  values: Record<string, unknown>;
  submittedAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  errorMessage: string | null;
}

export async function getQueue(): Promise<QueuedSubmission[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedSubmission[];
  } catch {
    return [];
  }
}

export async function addToQueue(item: Omit<QueuedSubmission, 'attemptCount' | 'lastAttemptAt' | 'errorMessage'>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...item,
    attemptCount: 0,
    lastAttemptAt: null,
    errorMessage: null,
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function updateQueueItem(id: string, updates: Partial<QueuedSubmission>): Promise<void> {
  const queue = await getQueue();
  const idx = queue.findIndex((q) => q.id === id);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...updates } as QueuedSubmission;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((q) => q.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
