import type * as DbTypes from '@/renderer/core/database';
import { DatabaseError } from '@/renderer/core/database';
import { Task } from '@/shared/utils/task';
import { BookNotFoundError } from './books.errors';

export interface ListBooksOptions {
  orderBy?: 'updated_at';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

export type ListBooksByProjectOptions = Omit<ListBooksOptions, 'orderBy'>;

export const BookRepository = {
  list: Task.fn(function* (
    books: DbTypes.BooksTable,
    options: ListBooksOptions = {},
  ) {
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

    return yield* Task.tryPromise(
      () => collection.toArray(),
      DatabaseError.from,
    );
  }),

  listByProject: Task.fn(function* (
    books: DbTypes.BooksTable,
    projectId: string,
    options: ListBooksByProjectOptions = {},
  ) {
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

    return yield* Task.tryPromise(
      () => collection.toArray(),
      DatabaseError.from,
    );
  }),

  get: Task.fn(function* (books: DbTypes.BooksTable, id: string) {
    const book = yield* Task.tryPromise(
      () => books.get(id),
      DatabaseError.from,
    );
    if (!book) {
      return yield* Task.fail(new BookNotFoundError(id));
    }
    return book;
  }),

  add: Task.fn(function* (books: DbTypes.BooksTable, book: DbTypes.BookInsert) {
    yield* Task.tryPromise(() => books.add(book), DatabaseError.from);
  }),

  update: Task.fn(function* (
    books: DbTypes.BooksTable,
    id: string,
    changes: DbTypes.BookUpdate,
  ) {
    const updatedCount = yield* Task.tryPromise(
      () => books.update(id, changes),
      DatabaseError.from,
    );
    if (updatedCount === 0) {
      return yield* Task.fail(new BookNotFoundError(id));
    }
  }),
} as const;
