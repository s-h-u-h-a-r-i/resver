import type * as DbTypes from '@/renderer/core/database';
import { DatabaseError } from '@/renderer/core/database';
import { Task } from '@/shared/utils/task';
import { SceneNotFoundError } from './scenes.errors';

export interface ListScenesOptions {
  orderBy?: 'updated_at';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

export type ListScenesByBookOptions = Omit<ListScenesOptions, 'orderBy'>;

export const SceneRepository = {
  list: Task.fn(function* (
    scenes: DbTypes.ScenesTable,
    options: ListScenesOptions = {},
  ) {
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

    return yield* Task.tryPromise(
      () => collection.toArray(),
      DatabaseError.from,
    );
  }),

  listByBook: Task.fn(function* (
    scenes: DbTypes.ScenesTable,
    bookId: string,
    options: ListScenesByBookOptions = {},
  ) {
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

    return yield* Task.tryPromise(
      () => collection.toArray(),
      DatabaseError.from,
    );
  }),

  get: Task.fn(function* (scenes: DbTypes.ScenesTable, id: string) {
    const scene = yield* Task.tryPromise(
      () => scenes.get(id),
      DatabaseError.from,
    );
    if (!scene) {
      return yield* Task.fail(new SceneNotFoundError(id));
    }
    return scene;
  }),

  add: Task.fn(function* (
    scenes: DbTypes.ScenesTable,
    scene: DbTypes.SceneInsert,
  ) {
    yield* Task.tryPromise(() => scenes.add(scene), DatabaseError.from);
  }),

  update: Task.fn(function* (
    scenes: DbTypes.ScenesTable,
    id: string,
    changes: DbTypes.SceneUpdate,
  ) {
    const updatedCount = yield* Task.tryPromise(
      () => scenes.update(id, changes),
      DatabaseError.from,
    );
    if (updatedCount === 0) {
      return yield* Task.fail(new SceneNotFoundError(id));
    }
  }),
} as const;
