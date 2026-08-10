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
import { createLiveQuery } from '@/renderer/core/database';
import { Result } from '@/shared/utils/result';
import { BookNotFoundError, BookNotInProjectError, useBooks } from '../books';
import { ProjectNotFoundError, useProjects } from '../projects';
import { SceneNotFoundError, SceneNotInBookError, useScenes } from '../scenes';
import {
  MissingBookReferenceError,
  MissingSceneReferenceError,
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
  sceneParagraphs: Accessor<DbTypes.LocalParagraph[] | null | undefined>;

  selectProject(id: string): Promise<Result<void, SelectProjectError>>;
  selectBook(id: string): Promise<Result<void, SelectBookError>>;
  selectScene(id: string): Promise<Result<void, SelectSceneError>>;
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

  const activeSceneId = createMemo(() => {
    const scene = selectedScene();
    return scene === undefined ? undefined : (scene?.id ?? null);
  });

  const sceneParagraphQuery = createLiveQuery(
    async ({ currentSceneId }) => {
      if (currentSceneId === undefined) {
        return { sceneId: undefined, paragraphs: undefined };
      }
      if (currentSceneId === null) {
        return { sceneId: null, paragraphs: null };
      }

      const paragraphs = await database.paragraphs
        .where('scene_id')
        .equals(currentSceneId)
        .and((paragraph) => paragraph.deleted_at === null)
        .sortBy('position');
      return { sceneId: currentSceneId, paragraphs };
    },
    {
      dep: () => ({ currentSceneId: activeSceneId() }),
      initial: { sceneId: undefined, paragraphs: undefined },
    },
  );

  const sceneParagraphs = createMemo(() => {
    const result = sceneParagraphQuery();
    return result.sceneId === activeSceneId() ? result.paragraphs : undefined;
  });

  const queue = createOperationQueue();

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

        void queue.enqueue(async () => {
          setWorkspaceSelection(
            Result.pipe(
              await resolveProject(database, effectiveProjectId),
              Result.tapErr((error) => console.error(error.message)),
              Result.unwrapOrThrow,
            ),
          );
        });
      },
      { defer: true },
    ),
  );

  onMount(() => {
    const currentProjects = projects();
    const initialProject = currentProjects[currentProjects.length - 1];

    void queue.enqueue(async () => {
      if (initialProject) {
        setWorkspaceSelection(
          Result.pipe(
            await resolveProject(database, initialProject.id),
            Result.tapErr((error) => console.error(error.message)),
            Result.unwrapOrThrow,
          ),
        );
      } else {
        setWorkspaceSelection(createEmptySelection());
      }
      setInitialized(true);
    });
  });

  const value: WorkspaceContextValue = {
    selectedProject,
    selectedBook,
    selectedScene,
    sceneParagraphs,

    selectProject(id) {
      return queue.enqueue(async () => {
        return Result.pipe(
          await resolveProject(database, id),
          Result.tap(setWorkspaceSelection),
          Result.asVoid,
        );
      });
    },

    selectBook(id) {
      const currentProjectId = untrack(() => selectedProject()?.id ?? null);
      return queue.enqueue(async () => {
        if (currentProjectId === null) {
          return Result.err(new NoActiveProjectError(id));
        }
        return Result.pipe(
          await resolveBook(database, currentProjectId, id),
          Result.tap(setWorkspaceSelection),
          Result.asVoid,
        );
      });
    },

    selectScene(id: string) {
      const currentProjectId = untrack(() => selectedProject()?.id ?? null);
      const currentBookId = untrack(() => selectedBook()?.id ?? null);

      return queue.enqueue(async () => {
        if (currentBookId === null) {
          return Result.err(new NoActiveBookError(id));
        }
        if (currentProjectId === null) {
          return Result.err(new NoActiveProjectError(currentBookId));
        }

        return Result.pipe(
          await resolveScene(database, currentProjectId, currentBookId, id),
          Result.tap(setWorkspaceSelection),
          Result.asVoid,
        );
      });
    },
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

async function resolveProject(db: DbTypes.AppDatabase, projectId: string) {
  return db.transaction(
    'rw',
    db.projects,
    db.books,
    db.scenes,
    async (transaction) => {
      const project = await transaction.projects.get(projectId);
      if (!project || project.deleted_at !== null) {
        return Result.err(new ProjectNotFoundError(projectId));
      }

      const resolveBookResult = await resolveRememberedBook(
        transaction.books,
        project,
      );
      if (Result.isErr(resolveBookResult)) return resolveBookResult;
      const book = resolveBookResult.value;
      let scene;
      if (book) {
        const resolvedSceneResult = await resolveRememberedScene(
          transaction.scenes,
          book,
        );
        if (Result.isErr(resolvedSceneResult)) return resolvedSceneResult;
        scene = resolvedSceneResult.value;
      } else {
        scene = null;
      }
      const resolvedBookId = book?.id ?? null;
      const resolvedSceneId = scene?.id ?? null;

      if (project.last_visited_book_id !== resolvedBookId) {
        await transaction.projects.update(project.id, {
          last_visited_book_id: resolvedBookId,
        });
      }
      if (book && book.last_visited_scene_id !== resolvedSceneId) {
        await transaction.books.update(book.id, {
          last_visited_scene_id: resolvedSceneId,
        });
      }

      return Result.ok({
        projectId: project.id,
        bookId: resolvedBookId,
        sceneId: resolvedSceneId,
      });
    },
  );
}

async function resolveBook(
  db: DbTypes.AppDatabase,
  projectId: string,
  bookId: string,
) {
  return db.transaction(
    'rw',
    db.projects,
    db.books,
    db.scenes,
    async (transaction) => {
      const project = await transaction.projects.get(projectId);
      const book = await transaction.books.get(bookId);

      if (!project || project.deleted_at !== null) {
        return Result.err(new ProjectNotFoundError(projectId));
      }
      if (!book || book.deleted_at !== null) {
        return Result.err(new BookNotFoundError(bookId));
      }
      if (book.project_id !== project.id) {
        return Result.err(new BookNotInProjectError(book.id, project.id));
      }

      const resolvedSceneResult = await resolveRememberedScene(
        transaction.scenes,
        book,
      );
      if (Result.isErr(resolvedSceneResult)) return resolvedSceneResult;
      const scene = resolvedSceneResult.value;
      const resolvedSceneId = scene?.id ?? null;

      if (project.last_visited_book_id !== book.id) {
        await transaction.projects.update(project.id, {
          last_visited_book_id: book.id,
        });
      }
      if (book.last_visited_scene_id !== resolvedSceneId) {
        await transaction.books.update(book.id, {
          last_visited_scene_id: resolvedSceneId,
        });
      }

      return Result.ok({
        projectId: project.id,
        bookId: book.id,
        sceneId: resolvedSceneId,
      });
    },
  );
}

async function resolveScene(
  db: DbTypes.AppDatabase,
  projectId: string,
  bookId: string,
  sceneId: string,
) {
  return db.transaction(
    'rw',
    db.projects,
    db.books,
    db.scenes,
    async (transaction) => {
      const project = await transaction.projects.get(projectId);
      const book = await transaction.books.get(bookId);
      const scene = await transaction.scenes.get(sceneId);

      if (!project || project.deleted_at !== null) {
        return Result.err(new ProjectNotFoundError(projectId));
      }
      if (!book || book.deleted_at !== null) {
        return Result.err(new BookNotFoundError(bookId));
      }
      if (!scene || scene.deleted_at !== null) {
        return Result.err(new SceneNotFoundError(sceneId));
      }
      if (book.project_id !== project.id) {
        return Result.err(new BookNotInProjectError(book.id, project.id));
      }
      if (scene.book_id !== book.id) {
        return Result.err(new SceneNotInBookError(scene.id, book.id));
      }

      if (project.last_visited_book_id !== book.id) {
        await transaction.projects.update(project.id, {
          last_visited_book_id: book.id,
        });
      }
      if (book.last_visited_scene_id !== scene.id) {
        await transaction.books.update(book.id, {
          last_visited_scene_id: scene.id,
        });
      }

      return Result.ok({
        projectId: project.id,
        bookId: book.id,
        sceneId: scene.id,
      });
    },
  );
}

async function resolveRememberedBook(
  booksTable: DbTypes.BooksTable,
  project: DbTypes.LocalProject,
) {
  const rememberedId = project.last_visited_book_id;
  if (rememberedId) {
    const rememberedBook = await booksTable.get(rememberedId);
    if (!rememberedBook || rememberedBook.deleted_at !== null) {
      return Result.err(
        new MissingBookReferenceError(project.id, rememberedId),
      );
    }
    if (rememberedBook.project_id !== project.id) {
      return Result.err(
        new BookNotInProjectError(rememberedBook.id, project.id),
      );
    }
    return Result.ok(rememberedBook);
  }

  const activeBooks = await booksTable
    .where('project_id')
    .equals(project.id)
    .and((book) => book.deleted_at === null)
    .sortBy('position');
  return Result.ok(activeBooks[activeBooks.length - 1] ?? null);
}

async function resolveRememberedScene(
  scenesTables: DbTypes.ScenesTable,
  book: DbTypes.LocalBook,
) {
  const rememberedId = book.last_visited_scene_id;
  if (rememberedId) {
    const rememberedScene = await scenesTables.get(rememberedId);
    if (!rememberedScene || rememberedScene.deleted_at !== null) {
      return Result.err(new MissingSceneReferenceError(book.id, rememberedId));
    }
    if (rememberedScene.book_id !== book.id) {
      return Result.err(new SceneNotInBookError(rememberedScene.id, book.id));
    }
    return Result.ok(rememberedScene);
  }

  const activeScenes = await scenesTables
    .where('book_id')
    .equals(book.id)
    .and((scene) => scene.deleted_at === null)
    .sortBy('position');
  return Result.ok(activeScenes[activeScenes.length - 1] ?? null);
}

function createEmptySelection(): WorkspaceSelection {
  return { projectId: null, bookId: null, sceneId: null };
}

function findByIdOrLast<T extends { id: string }>(arr: T[], id: string | null) {
  return arr.find((item) => item.id === id) ?? arr[arr.length - 1] ?? null;
}

function createOperationQueue() {
  let operationQueue = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>) {
    const result = operationQueue.then(operation);
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return { enqueue };
}
