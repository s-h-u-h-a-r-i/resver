import {
  createContext,
  Show,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/renderer/core/database';
import { createLiveQuery } from '@/renderer/core/database';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';
import { PageLoading } from '../../components/ui/page-loading';

interface BooksContextValue {
  books: Accessor<DbTypes.LocalBook[]>;

  createBook(projectId: string, title: string): Promise<string>;
  updateBook(id: string, title: string): Promise<void>;
  moveBook(
    id: string,
    prevBookId: string | undefined,
    nextBookId: string | undefined,
  ): Promise<void>;
  deleteBook(id: string): Promise<void>;
}

const BooksContext = createContext<BooksContextValue>();

export const BooksProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const books = createLiveQuery(() =>
    props.db.books.filter((b) => b.deleted_at === null).sortBy('position'),
  );

  const actions: Omit<BooksContextValue, 'books'> = {
    async createBook(projectId, title) {
      const projectBooks = await listBooksByProject(props.db.books, projectId);
      const position = generateKeyBetween(
        projectBooks[projectBooks.length - 1]?.position,
        undefined,
      );
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await props.db.books.add({
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
    },

    async updateBook(id, title) {
      await props.db.books.update(id, {
        title,
        updated_at: new Date().toISOString(),
      });
    },

    async moveBook(id, prevBookId, nextBookId) {
      await props.db.transaction('rw', props.db.books, async (trans) => {
        const book = await trans.books.get(id);
        if (!book || book.deleted_at !== null) return;

        const siblings = (
          await listBooksByProject(trans.books, book.project_id)
        ).filter((b) => b.id !== id);

        const prevIndex =
          prevBookId === undefined
            ? -1
            : siblings.findIndex((b) => b.id === prevBookId);
        const nextIndex =
          nextBookId === undefined
            ? siblings.length
            : siblings.findIndex((b) => b.id === nextBookId);

        if (
          (prevBookId !== undefined && prevIndex === -1) ||
          (nextBookId !== undefined && nextIndex === -1) ||
          nextIndex !== prevIndex + 1
        ) {
          return;
        }

        await trans.books.update(id, {
          position: generateKeyBetween(
            siblings[prevIndex]?.position,
            siblings[nextIndex]?.position,
          ),
          updated_at: new Date().toISOString(),
        });
      });
    },

    async deleteBook(id) {
      const now = new Date().toISOString();
      await props.db.books.update(id, { deleted_at: now, updated_at: now });
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

function listBooksByProject(books: DbTypes.BooksTable, projectId: string) {
  return books
    .where('project_id')
    .equals(projectId)
    .and((b) => b.deleted_at === null)
    .sortBy('position');
}
