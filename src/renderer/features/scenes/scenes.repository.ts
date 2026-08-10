import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { SceneNotFoundError } from './scenes.errors';

export interface ListScenesOptions {
  includeTombstones?: boolean;
  orderBy?: 'position' | 'createdAt' | 'updatedAt' | 'title';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

const orderFields = {
  position: 'position',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  title: 'title',
} as const;

export const SceneRepository = {
  list: Task.fn(
    async (scenes: DbTypes.ScenesTable, options: ListScenesOptions = {}) => {
      const rows = await scenes.toArray();
      return applyListOptions(rows, options);
    },
  ),

  listByBook: Task.fn(
    async (
      scenes: DbTypes.ScenesTable,
      bookId: string,
      options: ListScenesOptions = {},
    ) => {
      const rows = await scenes.where('book_id').equals(bookId).toArray();
      return applyListOptions(rows, options);
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

function applyListOptions(
  scenes: DbTypes.LocalScene[],
  options: ListScenesOptions,
) {
  const orderField = orderFields[options.orderBy ?? 'position'];
  const direction = options.direction === 'descending' ? -1 : 1;
  const offset = Math.max(0, options.offset ?? 0);
  const limit =
    options.limit === undefined ? undefined : Math.max(0, options.limit);

  const ordered = scenes
    .filter((scene) => options.includeTombstones || scene.deleted_at === null)
    .sort(
      (left, right) =>
        left[orderField].localeCompare(right[orderField]) * direction,
    );

  return ordered.slice(
    offset,
    limit === undefined ? undefined : offset + limit,
  );
}
