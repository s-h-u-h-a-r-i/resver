import type { SnakeToCamelCaseKeys } from '@/shared/utils/types';
import type { EntityTable, InsertType, UpdateSpec } from 'dexie';

export interface LocalProject {
  id: string;
  title: string;
  description: string | null;
  last_visited_book_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LocalProjectCamel = SnakeToCamelCaseKeys<LocalProject>;

export type ProjectsTable = EntityTable<LocalProject, 'id'>;

export type ProjectInsert = InsertType<LocalProject, 'id'>;

export type ProjectUpdate = UpdateSpec<ProjectInsert>;
