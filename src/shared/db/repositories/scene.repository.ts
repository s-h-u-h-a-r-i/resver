import type { InsertType, UpdateSpec } from 'dexie';

import { omitUndefined } from '@/shared/utils/omit-undefined';
import type { SnakeToCamelCaseKeys } from '@/shared/utils/types';
import { db, type AppDatabase } from '../client';
import type { LocalScene } from '../types';

type SceneInsert = InsertType<LocalScene, 'id'>;

type LocalSceneCamel = SnakeToCamelCaseKeys<LocalScene>;

export type CreateSceneInput = Pick<
  LocalSceneCamel,
  'bookId' | 'title' | 'position'
>;

export type UpdateSceneInput = Partial<
  Pick<LocalSceneCamel, 'position' | 'status' | 'title' | 'wordCount'>
>;

export const sceneRepository = createSceneRepository(db);

function createSceneRepository(db: AppDatabase) {
  return {
    get(id: string) {
      return db.scenes.get(id);
    },

    list() {
      return db.scenes
        .filter((s) => s.deleted_at === null)
        .sortBy('created_at');
    },

    listByBook(bookId: string) {
      return db.scenes
        .where('book_id')
        .equals(bookId)
        .and((s) => s.deleted_at === null)
        .sortBy('position');
    },

    create(input: CreateSceneInput) {
      const now = new Date().toISOString();
      const scene: SceneInsert = {
        id: crypto.randomUUID(),
        book_id: input.bookId,
        title: input.title,
        position: input.position,
        status: 'draft',
        word_count: 0,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      };
      return db.scenes.add(scene);
    },

    update(id: string, input: UpdateSceneInput) {
      return db.scenes.update(
        id,
        omitUndefined<UpdateSpec<SceneInsert>>({
          position: input.position,
          status: input.status,
          title: input.title,
          word_count: input.wordCount,
          updated_at: new Date().toISOString(),
        }),
      );
    },

    softDelete(id: string) {
      const now = new Date().toISOString();
      return db.scenes.update(id, { updated_at: now, deleted_at: now });
    },
  };
}
