import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'outnow.offline-tickets.index';
const CHUNK_SIZE = 1800;

type CacheIndex = Record<string, { chunks: number; savedAt: string }>;

function safeKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readIndex(): Promise<CacheIndex> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    return raw ? (JSON.parse(raw) as CacheIndex) : {};
  } catch {
    return {};
  }
}

async function writeIndex(index: CacheIndex) {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index));
}

export async function writeOfflineValue<T>(key: string, value: T) {
  const storageKey = safeKey(key);
  const serialized = JSON.stringify(value);
  const chunks: string[] = [];
  for (let i = 0; i < serialized.length; i += CHUNK_SIZE) chunks.push(serialized.slice(i, i + CHUNK_SIZE));

  const index = await readIndex();
  const previous = index[storageKey]?.chunks || 0;
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${storageKey}.${i}`, chunk)));
  if (previous > chunks.length) {
    await Promise.all(Array.from({ length: previous - chunks.length }, (_, i) => SecureStore.deleteItemAsync(`${storageKey}.${chunks.length + i}`)));
  }
  index[storageKey] = { chunks: chunks.length, savedAt: new Date().toISOString() };
  await writeIndex(index);
}

export async function readOfflineValue<T>(key: string): Promise<{ value: T; savedAt: string } | null> {
  const storageKey = safeKey(key);
  const index = await readIndex();
  const meta = index[storageKey];
  if (!meta?.chunks) return null;
  try {
    const chunks = await Promise.all(Array.from({ length: meta.chunks }, (_, i) => SecureStore.getItemAsync(`${storageKey}.${i}`)));
    if (chunks.some((chunk) => chunk == null)) return null;
    return { value: JSON.parse(chunks.join('')) as T, savedAt: meta.savedAt };
  } catch {
    return null;
  }
}

export async function removeOfflineValue(key: string) {
  const storageKey = safeKey(key);
  const index = await readIndex();
  const meta = index[storageKey];
  if (meta?.chunks) await Promise.all(Array.from({ length: meta.chunks }, (_, i) => SecureStore.deleteItemAsync(`${storageKey}.${i}`)));
  delete index[storageKey];
  await writeIndex(index);
}

export const offlineTicketKeys = {
  list: (accountId: string) => `outnow.tickets.${accountId}`,
  detail: (accountId: string, ticketId: string) => `outnow.ticket.${accountId}.${ticketId}`,
};
