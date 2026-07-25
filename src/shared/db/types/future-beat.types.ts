import type { EntityTable } from 'dexie';

export interface LocalFutureBeat {
  id: string;
  project_id: string;
  title: string;
  content: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FutureBeatsTable = EntityTable<LocalFutureBeat, 'id'>;
