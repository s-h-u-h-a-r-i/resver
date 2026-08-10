import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { BookNotFoundError } from './books.errors';

export interface ListBooksOptions {
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

export const BookRepository = {
  list: Task.fn(
    async (books: DbTypes.BooksTable, options: ListBooksOptions = {}) => {
      const rows = await books.toArray();
      return applyListOptions(rows, options);
    },
  ),

  listByProject: Task.fn(
    async (
      books: DbTypes.BooksTable,
      projectId: string,
      options: ListBooksOptions = {},
    ) => {
      const rows = await books.where('project_id').equals(projectId).toArray();
      return applyListOptions(rows, options);
    },
  ),

  get: Task.fn(async (books: DbTypes.BooksTable, id: string) => {
    const book = await books.get(id);
    return book ?? Result.err(new BookNotFoundError(id));
  }),

  add: Task.fn(async (books: DbTypes.BooksTable, book: DbTypes.BookInsert) => {
    await books.add(book);
  }),

  update: Task.fn(
    async (
      books: DbTypes.BooksTable,
      id: string,
      changes: DbTypes.BookUpdate,
    ) => {
      const updatedCount = await books.update(id, changes);
      if (updatedCount === 0) {
        return Result.err(new BookNotFoundError(id));
      }
    },
  ),
} as const;

function applyListOptions(
  books: DbTypes.LocalBook[],
  options: ListBooksOptions,
) {
  const orderField = orderFields[options.orderBy ?? 'position'];
  const direction = options.direction === 'descending' ? -1 : 1;
  const offset = Math.max(0, options.offset ?? 0);
  const limit =
    options.limit === undefined ? undefined : Math.max(0, options.limit);

  const ordered = books
    .filter((book) => options.includeTombstones || book.deleted_at === null)
    .sort(
      (left, right) =>
        left[orderField].localeCompare(right[orderField]) * direction,
    );

  return ordered.slice(
    offset,
    limit === undefined ? undefined : offset + limit,
  );
}
