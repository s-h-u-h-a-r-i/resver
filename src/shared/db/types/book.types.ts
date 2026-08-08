import type { SnakeToCamelCaseKeys } from '@/shared/utils/types';
import type { EntityTable, InsertType, UpdateSpec } from 'dexie';

export interface LocalBook {
  id: string;
  project_id: string;
  title: string;
  position: string;
  last_visited_scene_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LocalBookCamel = SnakeToCamelCaseKeys<LocalBook>;

export type BooksTable = EntityTable<LocalBook, 'id'>;

export type BookInsert = InsertType<LocalBook, 'id'>;

export type BookUpdate = UpdateSpec<BookInsert>;
