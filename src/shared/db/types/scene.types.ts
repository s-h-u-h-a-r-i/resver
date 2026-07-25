import type { SnakeToCamelCaseKeys } from '@/shared/utils/types';
import type { EntityTable, InsertType, UpdateSpec } from 'dexie';

export interface LocalScene {
  id: string;
  book_id: string;
  title: string;
  position: string;
  status: 'draft' | 'revised' | 'final';
  word_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LocalSceneCamel = SnakeToCamelCaseKeys<LocalScene>;

export type ScenesTable = EntityTable<LocalScene, 'id'>;

export type SceneInsert = InsertType<LocalScene, 'id'>;

export type SceneUpdate = UpdateSpec<SceneInsert>;
