import {
  createContext,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/shared/db';
import { createLiveQuery } from '@/shared/db';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';

interface BooksContextValue {
  books: Accessor<DbTypes.LocalBook[]>;

  createBook(projectId: string, title: string): Promise<string>;
  updateBook(id: string, title: string): Promise<void>;
  moveBook(id: string, nextBookId?: string): Promise<void>;
  deleteBook(id: string): Promise<void>;
}

const BooksContext = createContext<BooksContextValue>();

export const BooksProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const books = createLiveQuery(
    () =>
      props.db.books.filter((b) => b.deleted_at === null).sortBy('created_at'),
    { initial: [] },
  );

  const value: BooksContextValue = {
    books,

    async createBook(projectId, title) {
      const projectBooks = await listBooksByProject(props.db, projectId);
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

    async moveBook(id, nextBookId) {
      const book = books().find((b) => b.id === id);
      if (!book) return;

      const siblings = (
        await listBooksByProject(props.db, book.project_id)
      ).filter((b) => b.id !== id);

      let position: string;
      if (nextBookId) {
        const nextIndex = siblings.findIndex((b) => b.id === nextBookId);
        if (nextIndex === -1) return;
        const next = siblings[nextIndex];
        const prev = siblings[nextIndex - 1];
        position = generateKeyBetween(prev?.position, next.position);
      } else {
        const last = siblings[siblings.length - 1];
        position = generateKeyBetween(last?.position, undefined);
      }

      await props.db.books.update(id, {
        position,
        updated_at: new Date().toISOString(),
      });
    },

    async deleteBook(id) {
      const now = new Date().toISOString();
      await props.db.books.update(id, { deleted_at: now, updated_at: now });
    },
  };

  return (
    <BooksContext.Provider value={value}>
      {props.children}
    </BooksContext.Provider>
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

function listBooksByProject(db: DbTypes.AppDatabase, projectId: string) {
  return db.books
    .where('project_id')
    .equals(projectId)
    .and((b) => b.deleted_at === null)
    .sortBy('position');
}
