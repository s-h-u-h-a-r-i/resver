import {
  createContext,
  Show,
  untrack,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/renderer/core/database';
import { createLiveQuery, DatabaseError } from '@/renderer/core/database';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';
import { Task, TaskArray } from '@/shared/utils/task';
import { PageLoading } from '../../components/ui/page-loading';
import { ProjectNotFoundError, ProjectRepository } from '../projects';
import { BookNotFoundError, InvalidBookMoveError } from './books.errors';
import { BookRepository } from './books.repository';

type CreateBookError = ProjectNotFoundError | DbTypes.DatabaseError;
type UpdateBookError =
  ProjectNotFoundError | BookNotFoundError | DbTypes.DatabaseError;
type MoveBookError = UpdateBookError | InvalidBookMoveError;

interface BooksContextValue {
  books: Accessor<DbTypes.LocalBook[]>;

  createBook(projectId: string, title: string): Task<string, CreateBookError>;
  updateBook(id: string, title: string): Task<void, UpdateBookError>;
  moveBook(
    id: string,
    prevBookId: string | undefined,
    nextBookId: string | undefined,
  ): Task<void, MoveBookError>;
  deleteBook(id: string): Task<void, UpdateBookError>;
}

const BooksContext = createContext<BooksContextValue>();

export const BooksProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const books = createLiveQuery(() =>
    Task.runOrThrow(
      BookRepository.list(database.books).pipe(
        TaskArray.sortByString('position'),
      ),
    ),
  );

  const actions: Omit<BooksContextValue, 'books'> = {
    createBook: (projectId, title) => createBook(database, projectId, title),
    updateBook: (id, title) => updateBook(database, id, title),
    moveBook: (id, prevBookId, nextBookId) =>
      moveBook(database, id, prevBookId, nextBookId),
    deleteBook: (id) => deleteBook(database, id),
  };

  return (
    <Show when={books()} fallback={<PageLoading reason="Loading books" />}>
      {(loadedBooks) => (
        <BooksContext.Provider value={{ books: loadedBooks, ...actions }}>
          {props.children}
        </BooksContext.Provider>
      )}
    </Show>
  );
};

export function useBooks() {
  const ctx = useContext(BooksContext);
  if (!ctx) {
    throw new Error(
      `${useBooks.name} must be used within ${BooksProvider.name}`,
    );
  }
  return ctx;
}

const createBook = Task.fn(function* (
  database: DbTypes.AppDatabase,
  projectId: string,
  title: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveProject(transaction.projects, projectId);

            const projectBooks = yield* BookRepository.listByProject(
              transaction.books,
              projectId,
            ).pipe(TaskArray.sortByString('position'));
            const position = generateKeyBetween(
              projectBooks[projectBooks.length - 1]?.position,
              undefined,
            );
            const now = new Date().toISOString();
            const id = crypto.randomUUID();

            yield* BookRepository.add(transaction.books, {
              id,
              project_id: projectId,
              title,
              position,
              last_visited_scene_id: null,
              deleted_at: null,
              updated_at: now,
              created_at: now,
            });

            return id;
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const updateBook = Task.fn(function* (
  database: DbTypes.AppDatabase,
  bookId: string,
  title: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveBook(
              transaction.projects,
              transaction.books,
              bookId,
            );

            yield* BookRepository.update(transaction.books, bookId, {
              title,
              updated_at: new Date().toISOString(),
            });
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const moveBook = Task.fn(function* (
  database: DbTypes.AppDatabase,
  bookId: string,
  prevBookId: string | undefined,
  nextBookId: string | undefined,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        (transaction) =>
          Task.gen(function* () {
            const { book } = yield* requireActiveBook(
              transaction.projects,
              transaction.books,
              bookId,
            );

            const siblings = (yield* BookRepository.listByProject(
              transaction.books,
              book.project_id,
            ).pipe(TaskArray.sortByString('position'))).filter(
              (sibling) => sibling.id !== bookId,
            );

            const prevIndex =
              prevBookId === undefined
                ? -1
                : siblings.findIndex((sibling) => sibling.id === prevBookId);
            const nextIndex =
              nextBookId === undefined
                ? siblings.length
                : siblings.findIndex((sibling) => sibling.id === nextBookId);

            if (
              (prevBookId !== undefined && prevIndex === -1) ||
              (nextBookId !== undefined && nextIndex === -1) ||
              nextIndex !== prevIndex + 1
            ) {
              return yield* Task.fail(new InvalidBookMoveError(bookId));
            }

            yield* BookRepository.update(transaction.books, bookId, {
              position: generateKeyBetween(
                siblings[prevIndex]?.position,
                siblings[nextIndex]?.position,
              ),
              updated_at: new Date().toISOString(),
            });
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const deleteBook = Task.fn(function* (
  database: DbTypes.AppDatabase,
  bookId: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveBook(
              transaction.projects,
              transaction.books,
              bookId,
            );

            const now = new Date().toISOString();
            yield* BookRepository.update(transaction.books, bookId, {
              deleted_at: now,
              updated_at: now,
            });
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const requireActiveProject = (
  projects: DbTypes.ProjectsTable,
  projectId: string,
) =>
  Task.gen(function* () {
    const project = yield* ProjectRepository.get(projects, projectId);
    if (project.deleted_at !== null) {
      return yield* Task.fail(new ProjectNotFoundError(projectId));
    }
    return project;
  });

const requireActiveBook = (
  projects: DbTypes.ProjectsTable,
  books: DbTypes.BooksTable,
  bookId: string,
) =>
  Task.gen(function* () {
    const book = yield* BookRepository.get(books, bookId);
    if (book.deleted_at !== null) {
      return yield* Task.fail(new BookNotFoundError(bookId));
    }

    const project = yield* requireActiveProject(projects, book.project_id);
    return { project, book };
  });
