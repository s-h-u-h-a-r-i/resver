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
import { omitUndefined } from '@/shared/utils/omit-undefined';
import { Task, type ResultType } from '@/shared/utils/task';
import { PageLoading } from '../../components/ui/page-loading';
import { SceneNotFoundError } from './scenes.errors';
import { SceneRepository } from './scenes.repository';

type CreateSceneInput = Pick<DbTypes.LocalSceneCamel, 'title' | 'bookId'>;
type UpdateSceneInput = Partial<
  Pick<DbTypes.LocalSceneCamel, 'status' | 'title' | 'wordCount'>
>;

interface ScenesContextValue {
  scenes: Accessor<DbTypes.LocalScene[]>;

  createScene(input: CreateSceneInput): Promise<ResultType<string>>;
  updateScene(
    id: string,
    input: UpdateSceneInput,
  ): Promise<ResultType<void, SceneNotFoundError>>;
  moveScene(
    id: string,
    prevSceneId: string | undefined,
    nextSceneId: string | undefined,
  ): Promise<ResultType<void, SceneNotFoundError>>;
  deleteScene(id: string): Promise<ResultType<void, SceneNotFoundError>>;
}

const ScenesContext = createContext<ScenesContextValue>();

export const ScenesProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const scenes = createLiveQuery(() =>
    SceneRepository.list(database.scenes).pipe(Task.runOrThrow),
  );

  const actions: Omit<ScenesContextValue, 'scenes'> = {
    createScene(input) {
      return Task.gen(function* () {
        const bookScenes = yield* SceneRepository.listByBook(
          database.scenes,
          input.bookId,
        );
        const position = generateKeyBetween(
          bookScenes[bookScenes.length - 1]?.position,
          undefined,
        );
        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        yield* SceneRepository.add(database.scenes, {
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
      }).pipe(Task.run);
    },

    updateScene(id, input) {
      return SceneRepository.update(
        database.scenes,
        id,
        omitUndefined<DbTypes.SceneUpdate>({
          status: input.status,
          title: input.title,
          word_count: input.wordCount,
          updated_at: new Date().toISOString(),
        }),
      ).pipe(Task.run);
    },

    moveScene(id, prevSceneId, nextSceneId) {
      return database.transaction('rw', database.scenes, async (trans) => {
        return Task.gen(function* () {
          const scene = yield* SceneRepository.get(trans.scenes, id);
          if (scene.deleted_at !== null) {
            return yield* Task.fail(new SceneNotFoundError(id));
          }

          const siblings = (yield* SceneRepository.listByBook(
            trans.scenes,
            scene.book_id,
          )).filter((sibling) => sibling.id !== id);

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
            return;
          }

          yield* SceneRepository.update(trans.scenes, id, {
            position: generateKeyBetween(
              siblings[prevIndex]?.position,
              siblings[nextIndex]?.position,
            ),
            updated_at: new Date().toISOString(),
          });
        }).pipe(Task.run);
      });
    },

    deleteScene(id) {
      const now = new Date().toISOString();
      return SceneRepository.update(database.scenes, id, {
        deleted_at: now,
        updated_at: now,
      }).pipe(Task.run);
    },
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
