import {
  get,
  push,
  ref,
  remove,
  set,
  update,
  type DataSnapshot,
} from 'firebase/database';

import { realtimeDatabase } from '@/firebase/database';
import type { FirebaseRecord } from '@/types/firebase';

const snapshotToRecord = <T>(snapshot: DataSnapshot): FirebaseRecord<T> | null => {
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.key ?? '',
    ...(snapshot.val() as T),
  };
};

export const createRecord = async <T extends object>(
  path: string,
  data: T,
) => {
  const recordRef = push(ref(realtimeDatabase, path));
  await set(recordRef, data);

  return recordRef.key;
};

export const getRecordById = async <T>(
  path: string,
  id: string,
): Promise<FirebaseRecord<T> | null> => {
  const snapshot = await get(ref(realtimeDatabase, `${path}/${id}`));
  return snapshotToRecord<T>(snapshot);
};

export const listRecords = async <T>(
  path: string,
): Promise<Array<FirebaseRecord<T>>> => {
  const snapshot = await get(ref(realtimeDatabase, path));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val() as Record<string, T>).map(
    ([id, value]) => ({
      id,
      ...value,
    }),
  );
};

export const updateRecord = async <T extends object>(
  path: string,
  id: string,
  data: Partial<T>,
) => {
  await update(ref(realtimeDatabase, `${path}/${id}`), data);
};

export const removeRecord = async (path: string, id: string) => {
  await remove(ref(realtimeDatabase, `${path}/${id}`));
};
