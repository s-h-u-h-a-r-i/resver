import type * as DbTypes from '@/renderer/core/database';
import { DatabaseError } from '@/renderer/core/database';
import { Task } from '@/shared/utils/task';
import { ParagraphNotFoundError } from './paragraphs.errors';

export const ParagraphRepository = {
  listByScene: Task.fn(function* (
    paragraphs: DbTypes.ParagraphsTable,
    sceneId: string,
  ) {
    return yield* Task.tryPromise(
      () =>
        paragraphs
          .where('scene_id')
          .equals(sceneId)
          .filter((paragraph) => paragraph.deleted_at === null)
          .toArray(),
      DatabaseError.from,
    );
  }),

  get: Task.fn(function* (paragraphs: DbTypes.ParagraphsTable, id: string) {
    const paragraph = yield* Task.tryPromise(
      () => paragraphs.get(id),
      DatabaseError.from,
    );
    if (!paragraph) {
      return yield* Task.fail(new ParagraphNotFoundError(id));
    }
    return paragraph;
  }),

  add: Task.fn(function* (
    paragraphs: DbTypes.ParagraphsTable,
    paragraph: DbTypes.ParagraphInsert,
  ) {
    yield* Task.tryPromise(() => paragraphs.add(paragraph), DatabaseError.from);
  }),

  update: Task.fn(function* (
    paragraphs: DbTypes.ParagraphsTable,
    id: string,
    changes: DbTypes.ParagraphUpdate,
  ) {
    const updatedCount = yield* Task.tryPromise(
      () => paragraphs.update(id, changes),
      DatabaseError.from,
    );
    if (updatedCount === 0) {
      return yield* Task.fail(new ParagraphNotFoundError(id));
    }
  }),
} as const;
