import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'wdc:draft:{formVersionId}';

export interface DraftData {
  formVersionId: string;
  values: Record<string, unknown>;
  lastSavedAt: string;
}

export async function loadDraft(formVersionId: string): Promise<DraftData | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY.replace('{formVersionId}', formVersionId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

export async function saveDraft(formVersionId: string, values: Record<string, unknown>): Promise<void> {
  const draft: DraftData = {
    formVersionId,
    values,
    lastSavedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(DRAFT_KEY.replace('{formVersionId}', formVersionId), JSON.stringify(draft));
}

export async function clearDraft(formVersionId: string): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY.replace('{formVersionId}', formVersionId));
}
