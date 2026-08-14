import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
  untrack,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/renderer/core/database';
import { DatabaseError } from '@/renderer/core/database';
import { Task, TaskArray, TaskQueue } from '@/shared/utils/task';
import {
  BookNotFoundError,
  BookNotInProjectError,
  BookRepository,
  useBooks,
} from '../books';
import {
  ProjectNotFoundError,
  ProjectRepository,
  useProjects,
} from '../projects';
import {
  SceneNotFoundError,
  SceneNotInBookError,
  SceneRepository,
  useScenes,
} from '../scenes';
import {
  NoActiveBookError,
  NoActiveProjectError,
  type SelectBookError,
  type SelectProjectError,
  type SelectSceneError,
} from './workspace.errors';

interface WorkspaceSelection {
  projectId: string | null;
  bookId: string | null;
  sceneId: string | null;
}

interface WorkspaceContextValue {
  selectedProject: Accessor<DbTypes.LocalProject | null | undefined>;
  selectedBook: Accessor<DbTypes.LocalBook | null | undefined>;
  selectedScene: Accessor<DbTypes.LocalScene | null | undefined>;

  selectProject(id: string): Task<void, SelectProjectError>;
  selectBook(id: string): Task<void, SelectBookError>;
  selectScene(id: string): Task<void, SelectSceneError>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>();

export const WorkspaceProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const { projects } = useProjects();
  const { books } = useBooks();
  const { scenes } = useScenes();

  const [workspaceSelection, setWorkspaceSelection] =
    createSignal<WorkspaceSelection>(createEmptySelection());
  const [initialized, setInitialized] = createSignal(false);

  const selectedProject = createMemo(() => {
    if (!initialized()) return undefined;

    const activeProjects = projects();
    return findByIdOrLast(activeProjects, workspaceSelection().projectId);
  });

  const selectedBook = createMemo(() => {
    const project = selectedProject();
    if (project === undefined) return undefined;
    if (project === null) return null;

    const projectBooks = books().filter(
      (book) => book.project_id === project.id,
    );
    return findByIdOrLast(projectBooks, workspaceSelection().bookId);
  });

  const selectedScene = createMemo(() => {
    const book = selectedBook();
    if (book === undefined) return undefined;
    if (book === null) return null;

    const bookScenes = scenes().filter((scene) => scene.book_id === book.id);
    return findByIdOrLast(bookScenes, workspaceSelection().sceneId);
  });

  const queue = TaskQueue.make();

  createEffect(
    on(
      [projects, books, scenes],
      () => {
        if (!initialized()) return;

        const project = selectedProject();
        const book = selectedBook();
        const scene = selectedScene();

        const state = {
          effective: {
            projectId: project?.id ?? null,
            bookId: book?.id ?? null,
            sceneId: scene?.id ?? null,
          },
          stored: workspaceSelection(),
          projectCheckpoint: project?.last_visited_book_id ?? null,
          bookCheckpoint: book?.last_visited_scene_id ?? null,
        };

        const effectiveProjectId = state.effective.projectId;
        if (effectiveProjectId === null) {
          if (
            state.stored.projectId !== null ||
            state.stored.bookId !== null ||
            state.stored.sceneId !== null
          ) {
            setWorkspaceSelection(createEmptySelection());
          }
          return;
        }

        const requiresRepair =
          state.stored.projectId !== state.effective.projectId ||
          state.stored.bookId !== state.effective.bookId ||
          state.stored.sceneId !== state.effective.sceneId ||
          state.projectCheckpoint !== state.effective.bookId ||
          state.bookCheckpoint !== state.effective.sceneId;
        if (!requiresRepair) return;

        void queue
          .enqueue(() =>
            resolveProject(database, effectiveProjectId).pipe(
              Task.tap(setWorkspaceSelection),
              Task.tapError((error) => console.error(error.message)),
            ),
          )
          .pipe(Task.runOrThrow);
      },
      { defer: true },
    ),
  );

  onMount(() => {
    const currentProjects = projects();
    const initialProject = currentProjects[currentProjects.length - 1];

    void queue
      .enqueue(() =>
        Task.gen(function* () {
          if (initialProject) {
            setWorkspaceSelection(
              yield* resolveProject(database, initialProject.id),
            );
          } else {
            setWorkspaceSelection(createEmptySelection());
          }
          setInitialized(true);
        }).pipe(Task.tapError((error) => console.error(error.message))),
      )
      .pipe(Task.runOrThrow);
  });

  const value: WorkspaceContextValue = {
    selectedProject,
    selectedBook,
    selectedScene,

    selectProject: (id) =>
      queue.enqueue(() =>
        resolveProject(database, id).pipe(
          Task.tap(setWorkspaceSelection),
          Task.asVoid,
        ),
      ),

    selectBook: (id) =>
      queue.enqueue(() => {
        const currentProjectId = untrack(() => selectedProject()?.id ?? null);
        if (currentProjectId === null) {
          return Task.fail(new NoActiveProjectError(id));
        }

        return resolveBook(database, currentProjectId, id).pipe(
          Task.tap(setWorkspaceSelection),
          Task.asVoid,
        );
      }),

    selectScene: (id: string) =>
      queue.enqueue(() => {
        const currentProjectId = untrack(() => selectedProject()?.id ?? null);
        const currentBookId = untrack(() => selectedBook()?.id ?? null);

        if (currentBookId === null) {
          return Task.fail(new NoActiveBookError(id));
        }
        if (currentProjectId === null) {
          return Task.fail(new NoActiveProjectError(currentBookId));
        }

        return resolveScene(database, currentProjectId, currentBookId, id).pipe(
          Task.tap(setWorkspaceSelection),
          Task.asVoid,
        );
      }),
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {props.children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      `${useWorkspace.name} must be used within ${WorkspaceProvider.name}`,
    );
  }
  return ctx;
}

const resolveProject = Task.fn(function* (
  db: DbTypes.AppDatabase,
  projectId: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      db.transaction('rw', db.projects, db.books, db.scenes, (transaction) =>
        Task.gen(function* () {
          const project = yield* ProjectRepository.get(
            transaction.projects,
            projectId,
          );
          if (project.deleted_at !== null) {
            return yield* Task.fail(new ProjectNotFoundError(projectId));
          }

          const book = yield* resolveRememberedBook(transaction.books, project);
          const scene = book
            ? yield* resolveRememberedScene(transaction.scenes, book)
            : null;
          const resolvedBookId = book?.id ?? null;
          const resolvedSceneId = scene?.id ?? null;

          if (project.last_visited_book_id !== resolvedBookId) {
            yield* ProjectRepository.update(transaction.projects, project.id, {
              last_visited_book_id: resolvedBookId,
            });
          }
          if (book && book.last_visited_scene_id !== resolvedSceneId) {
            yield* BookRepository.update(transaction.books, book.id, {
              last_visited_scene_id: resolvedSceneId,
            });
          }

          return {
            projectId: project.id,
            bookId: resolvedBookId,
            sceneId: resolvedSceneId,
          };
        }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const resolveBook = Task.fn(function* (
  db: DbTypes.AppDatabase,
  projectId: string,
  bookId: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      db.transaction('rw', db.projects, db.books, db.scenes, (transaction) =>
        Task.gen(function* () {
          const [project, book] = yield* Task.all([
            ProjectRepository.get(transaction.projects, projectId).pipe(
              Task.filterOrElse(
                (project) => project.deleted_at === null,
                (project) => Task.fail(new ProjectNotFoundError(project.id)),
              ),
            ),
            BookRepository.get(transaction.books, bookId).pipe(
              Task.filterOrElse(
                (book) => book.deleted_at === null,
                () => Task.fail(new BookNotFoundError(bookId)),
              ),
              Task.filterOrElse(
                (book) => book.project_id === projectId,
                (book) =>
                  Task.fail(new BookNotInProjectError(book.id, projectId)),
              ),
            ),
          ]);

          const scene = yield* resolveRememberedScene(transaction.scenes, book);
          const resolvedSceneId = scene?.id ?? null;

          if (project.last_visited_book_id !== book.id) {
            yield* ProjectRepository.update(transaction.projects, project.id, {
              last_visited_book_id: book.id,
            });
          }
          if (book.last_visited_scene_id !== resolvedSceneId) {
            yield* BookRepository.update(transaction.books, book.id, {
              last_visited_scene_id: resolvedSceneId,
            });
          }

          return {
            projectId: project.id,
            bookId: book.id,
            sceneId: resolvedSceneId,
          };
        }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const resolveScene = Task.fn(function* (
  db: DbTypes.AppDatabase,
  projectId: string,
  bookId: string,
  sceneId: string,
) {
  const result = yield* Task.tryPromise(
    () =>
      db.transaction('rw', db.projects, db.books, db.scenes, (transaction) =>
        Task.gen(function* () {
          const [project, book, scene] = yield* Task.all([
            ProjectRepository.get(transaction.projects, projectId).pipe(
              Task.filterOrElse(
                (project) => project.deleted_at === null,
                (project) => Task.fail(new ProjectNotFoundError(project.id)),
              ),
            ),
            BookRepository.get(transaction.books, bookId).pipe(
              Task.filterOrElse(
                (book) => book.deleted_at === null,
                (book) => Task.fail(new BookNotFoundError(book.id)),
              ),
              Task.filterOrElse(
                (book) => book.project_id === projectId,
                (book) =>
                  Task.fail(new BookNotInProjectError(book.id, projectId)),
              ),
            ),
            SceneRepository.get(transaction.scenes, sceneId).pipe(
              Task.filterOrElse(
                (scene) => scene.deleted_at === null,
                (scene) => Task.fail(new SceneNotFoundError(scene.id)),
              ),
              Task.filterOrElse(
                (scene) => scene.book_id === bookId,
                (scene) => Task.fail(new SceneNotInBookError(scene.id, bookId)),
              ),
            ),
          ]);

          if (project.last_visited_book_id !== book.id) {
            yield* ProjectRepository.update(transaction.projects, project.id, {
              last_visited_book_id: book.id,
            });
          }
          if (book.last_visited_scene_id !== scene.id) {
            yield* BookRepository.update(transaction.books, book.id, {
              last_visited_scene_id: scene.id,
            });
          }

          return {
            projectId: project.id,
            bookId: book.id,
            sceneId: scene.id,
          };
        }).pipe(Task.runResult),
      ),
    DatabaseError.from,
  );
  return yield* Task.fromResult(result);
});

const resolveRememberedBook = Task.fn(function* (
  booksTable: DbTypes.BooksTable,
  project: DbTypes.LocalProject,
) {
  const rememberedId = project.last_visited_book_id;
  if (rememberedId) {
    const bookIsActiveAndInProject = (book: DbTypes.LocalBook) =>
      book.deleted_at === null && book.project_id === project.id;

    const rememberedBook = yield* BookRepository.get(
      booksTable,
      rememberedId,
    ).pipe(
      Task.filterOrElse(bookIsActiveAndInProject, () => Task.succeed(null)),
      Task.catchTag('bookNotFound', () => Task.succeed(null)),
    );

    if (rememberedBook) return rememberedBook;
  }

  return yield* BookRepository.listByProject(booksTable, project.id).pipe(
    TaskArray.sortByString('position'),
    Task.map((activeBooks) => activeBooks[activeBooks.length - 1] ?? null),
  );
});

const resolveRememberedScene = Task.fn(function* (
  scenesTable: DbTypes.ScenesTable,
  book: DbTypes.LocalBook,
) {
  const rememberedId = book.last_visited_scene_id;
  if (rememberedId) {
    const sceneIsActiveAndInBook = (scene: DbTypes.LocalScene) =>
      scene.deleted_at === null && scene.book_id === book.id;

    const rememberedScene = yield* SceneRepository.get(
      scenesTable,
      rememberedId,
    ).pipe(
      Task.filterOrElse(sceneIsActiveAndInBook, () => Task.succeed(null)),
      Task.catchTag('sceneNotFound', () => Task.succeed(null)),
    );

    if (rememberedScene) return rememberedScene;
  }

  return yield* SceneRepository.listByBook(scenesTable, book.id).pipe(
    TaskArray.sortByString('position'),
    Task.map((activeScenes) => activeScenes[activeScenes.length - 1] ?? null),
  );
});

function createEmptySelection(): WorkspaceSelection {
  return { projectId: null, bookId: null, sceneId: null };
}

function findByIdOrLast<T extends { id: string }>(arr: T[], id: string | null) {
  return arr.find((item) => item.id === id) ?? arr[arr.length - 1] ?? null;
}
