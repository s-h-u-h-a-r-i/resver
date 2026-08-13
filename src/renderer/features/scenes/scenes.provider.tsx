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
import { omitUndefined } from '@/shared/utils/omit-undefined';
import { Task, TaskArray } from '@/shared/utils/task';
import { PageLoading } from '../../components/ui/page-loading';
import { BookNotFoundError, BookRepository } from '../books';
import { ProjectNotFoundError, ProjectRepository } from '../projects';
import { InvalidSceneMoveError, SceneNotFoundError } from './scenes.errors';
import { SceneRepository } from './scenes.repository';

type CreateSceneInput = Pick<DbTypes.LocalSceneCamel, 'title' | 'bookId'>;
type UpdateSceneInput = Partial<
  Pick<DbTypes.LocalSceneCamel, 'status' | 'title' | 'wordCount'>
>;
type CreateSceneError =
  BookNotFoundError | ProjectNotFoundError | DbTypes.DatabaseError;
type UpdateSceneError = CreateSceneError | SceneNotFoundError;
type MoveSceneError = UpdateSceneError | InvalidSceneMoveError;

interface ScenesContextValue {
  scenes: Accessor<DbTypes.LocalScene[]>;

  createScene(input: CreateSceneInput): Task<string, CreateSceneError>;
  updateScene(
    id: string,
    input: UpdateSceneInput,
  ): Task<void, UpdateSceneError>;
  moveScene(
    id: string,
    prevSceneId: string | undefined,
    nextSceneId: string | undefined,
  ): Task<void, MoveSceneError>;
  deleteScene(id: string): Task<void, UpdateSceneError>;
}

const ScenesContext = createContext<ScenesContextValue>();

export const ScenesProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const scenes = createLiveQuery(() =>
    Task.runOrThrow(
      SceneRepository.list(database.scenes).pipe(
        TaskArray.sortByString('position'),
      ),
    ),
  );

  const actions: Omit<ScenesContextValue, 'scenes'> = {
    createScene: (input) => createScene(database, input),
    updateScene: (id, input) => updateScene(database, id, input),
    moveScene: (id, prevSceneId, nextSceneId) =>
      moveScene(database, id, prevSceneId, nextSceneId),
    deleteScene: (id) => deleteScene(database, id),
  };

  return (
    <Show when={scenes()} fallback={<PageLoading reason="Loading scenes" />}>
      {(loadedScenes) => (
        <ScenesContext.Provider value={{ scenes: loadedScenes, ...actions }}>
          {props.children}
        </ScenesContext.Provider>
      )}
    </Show>
  );
};

export function useScenes() {
  const ctx = useContext(ScenesContext);
  if (!ctx) {
    throw new Error(
      `${useScenes.name} must be used within ${ScenesProvider.name}`,
    );
  }
  return ctx;
}

const createScene = Task.fn(function* (
  database: DbTypes.AppDatabase,
  input: CreateSceneInput,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveBook(
              transaction.projects,
              transaction.books,
              input.bookId,
            );

            const bookScenes = yield* SceneRepository.listByBook(
              transaction.scenes,
              input.bookId,
            ).pipe(TaskArray.sortByString('position'));
            const position = generateKeyBetween(
              bookScenes[bookScenes.length - 1]?.position,
              undefined,
            );
            const now = new Date().toISOString();
            const id = crypto.randomUUID();

            yield* SceneRepository.add(transaction.scenes, {
              id,
              book_id: input.bookId,
              title: input.title,
              position,
              status: 'draft',
              word_count: 0,
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

const updateScene = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
  input: UpdateSceneInput,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveScene(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              sceneId,
            );

            yield* SceneRepository.update(
              transaction.scenes,
              sceneId,
              omitUndefined<DbTypes.SceneUpdate>({
                status: input.status,
                title: input.title,
                word_count: input.wordCount,
                updated_at: new Date().toISOString(),
              }),
            );
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const moveScene = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
  prevSceneId: string | undefined,
  nextSceneId: string | undefined,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        (transaction) =>
          Task.gen(function* () {
            const { scene } = yield* requireActiveScene(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              sceneId,
            );

            const siblings = (yield* SceneRepository.listByBook(
              transaction.scenes,
              scene.book_id,
            ).pipe(TaskArray.sortByString('position'))).filter(
              (sibling) => sibling.id !== sceneId,
            );

            const prevIndex =
              prevSceneId === undefined
                ? -1
                : siblings.findIndex((sibling) => sibling.id === prevSceneId);
            const nextIndex =
              nextSceneId === undefined
                ? siblings.length
                : siblings.findIndex((sibling) => sibling.id === nextSceneId);

            if (
              (prevSceneId !== undefined && prevIndex === -1) ||
              (nextSceneId !== undefined && nextIndex === -1) ||
              nextIndex !== prevIndex + 1
            ) {
              return yield* Task.fail(new InvalidSceneMoveError(sceneId));
            }

            yield* SceneRepository.update(transaction.scenes, sceneId, {
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

const deleteScene = Task.fn(function* (
  database: DbTypes.AppDatabase,
  sceneId: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      database.transaction(
        'rw',
        database.projects,
        database.books,
        database.scenes,
        (transaction) =>
          Task.gen(function* () {
            yield* requireActiveScene(
              transaction.projects,
              transaction.books,
              transaction.scenes,
              sceneId,
            );

            const now = new Date().toISOString();
            yield* SceneRepository.update(transaction.scenes, sceneId, {
              deleted_at: now,
              updated_at: now,
            });
          }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
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

    const project = yield* ProjectRepository.get(projects, book.project_id);
    if (project.deleted_at !== null) {
      return yield* Task.fail(new ProjectNotFoundError(project.id));
    }

    return { project, book };
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

    const { project, book } = yield* requireActiveBook(
      projects,
      books,
      scene.book_id,
    );
    return { project, book, scene };
  });
