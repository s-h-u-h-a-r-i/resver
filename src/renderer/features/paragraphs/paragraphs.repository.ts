import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { ParagraphNotFoundError } from './paragraphs.errors';

export const ParagraphRepository = {
  listByScene: Task.fn(
    async (paragraphs: DbTypes.ParagraphsTable, sceneId: string) =>
      paragraphs
        .where('scene_id')
        .equals(sceneId)
        .filter((paragraph) => paragraph.deleted_at === null)
        .toArray(),
  ),

  get: Task.fn(async (paragraphs: DbTypes.ParagraphsTable, id: string) => {
    const paragraph = await paragraphs.get(id);
    return paragraph ?? Result.err(new ParagraphNotFoundError(id));
  }),

  add: Task.fn(
    async (
      paragraphs: DbTypes.ParagraphsTable,
      paragraph: DbTypes.ParagraphInsert,
    ) => {
      await paragraphs.add(paragraph);
    },
  ),

  update: Task.fn(
    async (
      paragraphs: DbTypes.ParagraphsTable,
      id: string,
      changes: DbTypes.ParagraphUpdate,
    ) => {
      const updatedCount = await paragraphs.update(id, changes);
      if (updatedCount === 0) {
        return Result.err(new ParagraphNotFoundError(id));
      }
    },
  ),
} as const;
