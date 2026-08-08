import type { EntityTable } from 'dexie';

export interface LocalParagraph {
  id: string;
  scene_id: string;
  content: string;
  position: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ParagraphsTable = EntityTable<LocalParagraph, 'id'>;
