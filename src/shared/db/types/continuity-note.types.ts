import type { EntityTable } from 'dexie';

export interface LocalContinuityNote {
  id: string;
  paragraph_id: string;
  title: string;
  content: string;
  supersedes_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContinuityNotesTable = EntityTable<LocalContinuityNote, 'id'>;
