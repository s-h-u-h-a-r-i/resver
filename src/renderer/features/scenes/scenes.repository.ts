import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { SceneNotFoundError } from './scenes.errors';

export interface ListScenesOptions {
  orderBy?: 'updated_at';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

export type ListScenesByBookOptions = Omit<ListScenesOptions, 'orderBy'>;

export const SceneRepository = {
  list: Task.fn(
    async (scenes: DbTypes.ScenesTable, options: ListScenesOptions = {}) => {
      let collection = options.orderBy
        ? scenes.orderBy(options.orderBy)
        : scenes.toCollection();

      collection = collection.filter((scene) => scene.deleted_at === null);

      if (options.direction === 'descending') {
        collection = collection.reverse();
      }

      if (options.offset !== undefined) {
        collection = collection.offset(Math.max(0, options.offset));
      }

      if (options.limit !== undefined) {
        collection = collection.limit(Math.max(0, options.limit));
      }

      return collection.toArray();
    },
  ),

  listByBook: Task.fn(
    async (
      scenes: DbTypes.ScenesTable,
      bookId: string,
      options: ListScenesByBookOptions = {},
    ) => {
      let collection = scenes.where('book_id').equals(bookId);

      collection = collection.filter((scene) => scene.deleted_at === null);

      if (options.direction === 'descending') {
        collection = collection.reverse();
      }

      if (options.offset !== undefined) {
        collection = collection.offset(Math.max(0, options.offset));
      }

      if (options.limit !== undefined) {
        collection = collection.limit(Math.max(0, options.limit));
      }

      return collection.toArray();
    },
  ),

  get: Task.fn(async (scenes: DbTypes.ScenesTable, id: string) => {
    const scene = await scenes.get(id);
    return scene ?? Result.err(new SceneNotFoundError(id));
  }),

  add: Task.fn(
    async (scenes: DbTypes.ScenesTable, scene: DbTypes.SceneInsert) => {
      await scenes.add(scene);
    },
  ),

  update: Task.fn(
    async (
      scenes: DbTypes.ScenesTable,
      id: string,
      changes: DbTypes.SceneUpdate,
    ) => {
      const updatedCount = await scenes.update(id, changes);
      if (updatedCount === 0) {
        return Result.err(new SceneNotFoundError(id));
      }
    },
  ),
} as const;
