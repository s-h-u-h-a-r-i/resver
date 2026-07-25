import type { InsertType, UpdateSpec } from 'dexie';

import { omitUndefined } from '@/shared/utils/omit-undefined';
import type { SnakeToCamelCaseKeys } from '@/shared/utils/types';
import { db, type AppDatabase } from '../client';
import type { LocalBook } from '../types';

type bookInsert = InsertType<LocalBook, 'id'>;

type LocalBookCamel = SnakeToCamelCaseKeys<LocalBook>;

export type CreateBookInput = Pick<
  LocalBookCamel,
  'projectId' | 'title' | 'position'
>;

export type UpdateBookInput = Partial<
  Pick<LocalBookCamel, 'title' | 'position'>
>;

export const bookRepository = createBookRepository(db);

function createBookRepository(db: AppDatabase) {
  return {
    get(id: string) {
      return db.books.get(id);
    },

    list() {
      return db.books.filter((b) => b.deleted_at === null).sortBy('created_at');
    },

    listByProject(projectId: string) {
      return db.books
        .where('project_id')
        .equals(projectId)
        .and((b) => b.deleted_at === null)
        .sortBy('position');
    },

    create(input: CreateBookInput) {
      const now = new Date().toISOString();
      const book: bookInsert = {
        id: crypto.randomUUID(),
        project_id: input.projectId,
        title: input.title,
        position: input.position,
        deleted_at: null,
        updated_at: now,
        created_at: now,
      };
      return db.books.add(book);
    },

    update(id: string, input: UpdateBookInput) {
      return db.books.update(
        id,
        omitUndefined<UpdateSpec<bookInsert>>({
          title: input.title,
          position: input.position,
          updated_at: new Date().toISOString(),
        }),
      );
    },

    softDelete(id: string) {
      const now = new Date().toISOString();
      return db.books.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    },
  };
}
