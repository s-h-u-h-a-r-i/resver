import {
  createContext,
  Show,
  untrack,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/renderer/core/database';
import { createLiveQuery } from '@/renderer/core/database';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';
import { Task, type ResultType } from '@/shared/utils/task';
import { PageLoading } from '../../components/ui/page-loading';
import { BookNotFoundError } from './books.errors';
import { BookRepository } from './books.repository';

interface BooksContextValue {
  books: Accessor<DbTypes.LocalBook[]>;

  createBook(projectId: string, title: string): Promise<ResultType<string>>;
  updateBook(
    id: string,
    title: string,
  ): Promise<ResultType<void, BookNotFoundError>>;
  moveBook(
    id: string,
    prevBookId: string | undefined,
    nextBookId: string | undefined,
  ): Promise<ResultType<void, BookNotFoundError>>;
  deleteBook(id: string): Promise<ResultType<void, BookNotFoundError>>;
}

const BooksContext = createContext<BooksContextValue>();

export const BooksProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const books = createLiveQuery(() =>
    BookRepository.list(database.books).pipe(Task.runOrThrow),
  );

  const actions: Omit<BooksContextValue, 'books'> = {
    createBook(projectId, title) {
      return Task.gen(function* () {
        const projectBooks = yield* BookRepository.listByProject(
          database.books,
          projectId,
        );
        const position = generateKeyBetween(
          projectBooks[projectBooks.length - 1]?.position,
          undefined,
        );
        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        yield* BookRepository.add(database.books, {
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
      }).pipe(Task.run);
    },

    updateBook(id, title) {
      return BookRepository.update(database.books, id, {
        title,
        updated_at: new Date().toISOString(),
      }).pipe(Task.run);
    },

    moveBook(id, prevBookId, nextBookId) {
      return database.transaction('rw', database.books, async (trans) => {
        return Task.gen(function* () {
          const book = yield* BookRepository.get(trans.books, id);
          if (book.deleted_at !== null) {
            return yield* Task.fail(new BookNotFoundError(id));
          }

          const siblings = (yield* BookRepository.listByProject(
            trans.books,
            book.project_id,
          )).filter((sibling) => sibling.id !== id);

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
            return;
          }

          yield* BookRepository.update(trans.books, id, {
            position: generateKeyBetween(
              siblings[prevIndex]?.position,
              siblings[nextIndex]?.position,
            ),
            updated_at: new Date().toISOString(),
          });
        }).pipe(Task.run);
      });
    },

    deleteBook(id) {
      const now = new Date().toISOString();
      return BookRepository.update(database.books, id, {
        deleted_at: now,
        updated_at: now,
      }).pipe(Task.run);
    },
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
