import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { BookNotFoundError } from './books.errors';

export interface ListBooksOptions {
  orderBy?: 'updated_at';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

export type ListBooksByProjectOptions = Omit<ListBooksOptions, 'orderBy'>;

export const BookRepository = {
  list: Task.fn(
    async (books: DbTypes.BooksTable, options: ListBooksOptions = {}) => {
      let collection = options.orderBy
        ? books.orderBy(options.orderBy)
        : books.toCollection();

      collection = collection.filter((book) => book.deleted_at === null);

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

  listByProject: Task.fn(
    async (
      books: DbTypes.BooksTable,
      projectId: string,
      options: ListBooksByProjectOptions = {},
    ) => {
      let collection = books.where('project_id').equals(projectId);

      collection = collection.filter((book) => book.deleted_at === null);

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
