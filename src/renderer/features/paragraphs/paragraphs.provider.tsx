import {
  createContext,
  createMemo,
  untrack,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/renderer/core/database';
import { DatabaseError, createLiveQuery } from '@/renderer/core/database';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';
import { omitUndefined } from '@/shared/utils/omit-undefined';
import { Task, TaskArray } from '@/shared/utils/task';
import { BookNotFoundError, BookRepository } from '../books';
import { ProjectNotFoundError, ProjectRepository } from '../projects';
import { SceneNotFoundError, SceneRepository } from '../scenes';
import {
  InvalidParagraphMoveError,
  ParagraphNotFoundError,
  ParagraphNotInSceneError,
} from './paragraphs.errors';
import { ParagraphRepository } from './paragraphs.repository';

export type CreateParagraphInput = Pick<DbTypes.LocalParagraph, 'content'>;

export type UpdateParagraphInput = Partial<
  Pick<DbTypes.LocalParagraph, 'content'>
>;

export type CreateParagraphError =
  | ProjectNotFoundError
  | BookNotFoundError
  | SceneNotFoundError
  | DbTypes.DatabaseError;

export type UpdateParagraphError =
  CreateParagraphError | ParagraphNotFoundError | ParagraphNotInSceneError;

export type MoveParagraphError =
  UpdateParagraphError | InvalidParagraphMoveError;

interface ParagraphsContextValue {
  paragraphs: Accessor<DbTypes.LocalParagraph[] | undefined>;

  createParagraph(
    sceneId: string,
    input: CreateParagraphInput,
  ): Task<string, CreateParagraphError>;
  updateParagraph(
    sceneId: string,
    paragraphId: string,
    input: UpdateParagraphInput,
  ): Task<void, UpdateParagraphError>;
  moveParagraph(
    sceneId: string,
    paragraphId: string,
    previousParagraphId: string | undefined,
    nextParagraphId: string | undefined,
  ): Task<void, MoveParagraphError>;
  deleteParagraph(
    sceneId: string,
    paragraphId: string,
  ): Task<void, UpdateParagraphError>;
}

const ParagraphsContext = createContext<ParagraphsContextValue>();

export const ParagraphsProvider: ParentComponent<{
  db: DbTypes.AppDatabase;
  sceneId: string;
}> = (props) => {
  const database = untrack(() => props.db);

  const paragraphQuery = createLiveQuery<
    string,
    | {
        sceneId: string;
        paragraphs: DbTypes.LocalParagraph[];
      }
    | {
        sceneId: undefined;
        paragraphs: undefined;
      }
  >(
    async (sceneId) => ({
      sceneId,
      paragraphs: await Task.runOrThrow(
        ParagraphRepository.listByScene(database.paragraphs, sceneId).pipe(
          TaskArray.sortByString('position'),
        ),
      ),
    }),
    {
      dep: () => props.sceneId,
      initial: {
        sceneId: undefined,
        paragraphs: undefined,
      },
    },
  );

  const paragraphs = createMemo(() => {
    const result = paragraphQuery();
    return result.sceneId === props.sceneId ? result.paragraphs : undefined;
  });

  const actions: Omit<ParagraphsContextValue, 'paragraphs'> = {
    createParagraph: (sceneId, input) =>
      createParagraph(database, sceneId, input),

    updateParagraph: (sceneId, paragraphId, input) =>
      updateParagraph(database, sceneId, paragraphId, input),

    moveParagraph: (
      sceneId,
      paragraphId,
      previousParagraphId,
      nextParagraphId,
    ) =>
      moveParagraph(
        database,
        sceneId,
        paragraphId,
        previousParagraphId,
        nextParagraphId,
      ),

    deleteParagraph: (sceneId, paragraphId) =>
      deleteParagraph(database, sceneId, paragraphId),
  };

  return (
    <ParagraphsContext.Provider value={{ paragraphs, ...actions }}>
      {props.children}
    </ParagraphsContext.Provider>
  );
};

export function useParagraphs() {
  const context = useContext(ParagraphsContext);
  if (!context) {
    throw new Error(
      `${useParagraphs.name} must be used within ${ParagraphsProvider.name}`,
    );
  }
  return context;
}

const createParagraph = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
  input: CreateParagraphInput,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        database.paragraphs,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveScene(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              sceneId,
            );

            const sceneParagraphs = yield* ParagraphRepository.listByScene(
              transaction.paragraphs,
              sceneId,
            ).pipe(TaskArray.sortByString('position'));
            const now = new Date().toISOString();
            const id = crypto.randomUUID();

            yield* ParagraphRepository.add(transaction.paragraphs, {
              id,
              scene_id: sceneId,
              content: input.content,
              position: generateKeyBetween(
                sceneParagraphs[sceneParagraphs.length - 1]?.position,
                undefined,
              ),
              deleted_at: null,
              created_at: now,
              updated_at: now,
            });

            return id;
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const updateParagraph = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
  paragraphId: string,
  input: UpdateParagraphInput,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        database.paragraphs,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveParagraph(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              transaction.paragraphs,
              sceneId,
              paragraphId,
            );

            yield* ParagraphRepository.update(
              transaction.paragraphs,
              paragraphId,
              omitUndefined<DbTypes.ParagraphUpdate>({
                content: input.content,
                updated_at: new Date().toISOString(),
              }),
            );
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const moveParagraph = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
  paragraphId: string,
  previousParagraphId: string | undefined,
  nextParagraphId: string | undefined,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        database.paragraphs,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveParagraph(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              transaction.paragraphs,
              sceneId,
              paragraphId,
            );

            const siblings = (yield* ParagraphRepository.listByScene(
              transaction.paragraphs,
              sceneId,
            ).pipe(TaskArray.sortByString('position'))).filter(
              (paragraph) => paragraph.id !== paragraphId,
            );

            const previousIndex =
              previousParagraphId === undefined
                ? -1
                : siblings.findIndex(
                    (paragraph) => paragraph.id === previousParagraphId,
                  );
            const nextIndex =
              nextParagraphId === undefined
                ? siblings.length
                : siblings.findIndex(
                    (paragraph) => paragraph.id === nextParagraphId,
                  );

            if (
              (previousParagraphId !== undefined && previousIndex === -1) ||
              (nextParagraphId !== undefined && nextIndex === -1) ||
              nextIndex !== previousIndex + 1
            ) {
              return yield* Task.fail(
                new InvalidParagraphMoveError(paragraphId),
              );
            }

            yield* ParagraphRepository.update(
              transaction.paragraphs,
              paragraphId,
              {
                position: generateKeyBetween(
                  siblings[previousIndex]?.position,
                  siblings[nextIndex]?.position,
                ),
                updated_at: new Date().toISOString(),
              },
            );
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const deleteParagraph = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
  paragraphId: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        database.paragraphs,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveParagraph(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              transaction.paragraphs,
              sceneId,
              paragraphId,
            );

            const now = new Date().toISOString();
            yield* ParagraphRepository.update(
              transaction.paragraphs,
              paragraphId,
              {
                deleted_at: now,
                updated_at: now,
              },
            );
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const requireActiveScene = (
  projects: DbTypes.ProjectsTable,
  books: DbTypes.BooksTable,
  scenes: DbTypes.ScenesTable,
  sceneId: string,
) =>
  Task.gen(function* () {
    const scene = yield* SceneRepository.get(scenes, sceneId);
    if (scene.deleted_at !== null) {
      return yield* Task.fail(new SceneNotFoundError(sceneId));
    }

    const book = yield* BookRepository.get(books, scene.book_id);
    if (book.deleted_at !== null) {
      return yield* Task.fail(new BookNotFoundError(book.id));
    }

    const project = yield* ProjectRepository.get(projects, book.project_id);
    if (project.deleted_at !== null) {
      return yield* Task.fail(new ProjectNotFoundError(project.id));
    }

    return { project, book, scene };
  });

const requireActiveParagraph = (
  projects: DbTypes.ProjectsTable,
  books: DbTypes.BooksTable,
  scenes: DbTypes.ScenesTable,
  paragraphs: DbTypes.ParagraphsTable,
  sceneId: string,
  paragraphId: string,
) =>
  Task.gen(function* () {
    const paragraph = yield* ParagraphRepository.get(paragraphs, paragraphId);
    if (paragraph.deleted_at !== null) {
      return yield* Task.fail(new ParagraphNotFoundError(paragraphId));
    }
    if (paragraph.scene_id !== sceneId) {
      return yield* Task.fail(
        new ParagraphNotInSceneError(paragraphId, sceneId),
      );
    }

    const { project, book, scene } = yield* requireActiveScene(
      projects,
      books,
      scenes,
      paragraph.scene_id,
    );
    return { project, book, scene, paragraph };
  });
