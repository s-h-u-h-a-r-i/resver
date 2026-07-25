import {
  createContext,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import {
  bookRepository,
  createLiveQuery,
  type LocalBook,
  type UpdateBookInput,
} from '@/shared/db';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';

interface BooksContextValue {
  books: Accessor<LocalBook[]>;

  createBook(projectId: string, title: string): Promise<void>;
  updateBook(
    id: string,
    input: Omit<UpdateBookInput, 'position'>,
  ): Promise<void>;
  moveBook(id: string, nextBookId?: string): Promise<void>;
  softDeleteBook(id: string): Promise<void>;
}

const BooksContext = createContext<BooksContextValue>();

export const BooksProvider: ParentComponent = (props) => {
  const books = createLiveQuery(bookRepository.list, { initial: [] });

  const createBook = async (projectId: string, title: string) => {
    const projectBooks = await bookRepository.listByProject(projectId);
    const position = generateKeyBetween(
      projectBooks[projectBooks.length - 1]?.position,
      undefined,
    );
    await bookRepository.create({ projectId, title, position });
  };

  const updateBook = async (
    id: string,
    input: Omit<UpdateBookInput, 'position'>,
  ) => {
    await bookRepository.update(id, input);
  };

  const moveBook = async (id: string, nextBookId?: string) => {
    const book = books().find((b) => b.id === id);
    if (!book) return;

    const siblings = (
      await bookRepository.listByProject(book.project_id)
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

    await bookRepository.update(id, { position });
  };

  const softDeleteBook = async (id: string) => {
    await bookRepository.softDelete(id);
  };

  return (
    <BooksContext.Provider
      value={{
        books,
        createBook,
        updateBook,
        moveBook,
        softDeleteBook,
      }}>
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
