import { omitUndefined } from '@/shared/utils/omit-undefined';
import type { InsertType, UpdateSpec } from 'dexie';
import { db, type AppDatabase } from '../client';
import type { LocalBook } from '../types';

export interface CreateBookInput {
  projectId: string;
  title: string;
  position: string;
}

export type UpdateBookInput = Partial<Pick<LocalBook, 'title' | 'position'>>;

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
      const book: InsertType<LocalBook, 'id'> = {
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
        omitUndefined<UpdateSpec<LocalBook>>({
          title: input.title,
          position: input.position,
          updated_at: new Date().toISOString(),
        }),
      );
    },

    softDelete(id: string) {
      return db.books.update(id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
  };
}
