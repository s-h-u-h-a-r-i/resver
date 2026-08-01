import {
  createContext,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/shared/db';
import { createLiveQuery } from '@/shared/db';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';
import { omitUndefined } from '@/shared/utils/omit-undefined';

type CreateSceneInput = Pick<DbTypes.LocalSceneCamel, 'title' | 'bookId'>;
type UpdateSceneInput = Partial<
  Pick<DbTypes.LocalSceneCamel, 'status' | 'title' | 'wordCount'>
>;

interface ScenesContextValue {
  scenes: Accessor<DbTypes.LocalScene[]>;

  createScene(input: CreateSceneInput): Promise<string>;
  updateScene(id: string, input: UpdateSceneInput): Promise<void>;
  moveScene(
    id: string,
    prevSceneId: string | undefined,
    nextSceneId: string | undefined,
  ): Promise<void>;
  deleteScene(id: string): Promise<void>;
}

const ScenesContext = createContext<ScenesContextValue>();

export const ScenesProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const scenes = createLiveQuery(
    () =>
      props.db.scenes.filter((s) => s.deleted_at === null).sortBy('position'),
    { initial: [] },
  );

  const value: ScenesContextValue = {
    scenes,

    async createScene(input) {
      const bookScenes = await listScenesByBook(props.db.scenes, input.bookId);
      const position = generateKeyBetween(
        bookScenes[bookScenes.length - 1]?.position,
        undefined,
      );
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await props.db.scenes.add({
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
    },

    async updateScene(id, input) {
      await props.db.scenes.update(
        id,
        omitUndefined<DbTypes.SceneUpdate>({
          status: input.status,
          title: input.title,
          word_count: input.wordCount,
          updated_at: new Date().toISOString(),
        }),
      );
    },

    async moveScene(id, prevSceneId, nextSceneId) {
      await props.db.transaction('rw', props.db.scenes, async (trans) => {
        const scene = await trans.scenes.get(id);
        if (!scene || scene.deleted_at !== null) return;

        const siblings = (
          await listScenesByBook(trans.scenes, scene.book_id)
        ).filter((s) => s.id !== id);

        const prevIndex =
          prevSceneId === undefined
            ? -1
            : siblings.findIndex((s) => s.id === prevSceneId);
        const nextIndex =
          nextSceneId === undefined
            ? siblings.length
            : siblings.findIndex((s) => s.id === nextSceneId);

        if (
          (prevSceneId !== undefined && prevIndex === -1) ||
          (nextSceneId !== undefined && nextIndex === -1) ||
          nextIndex !== prevIndex + 1
        ) {
          return;
        }

        await trans.scenes.update(id, {
          position: generateKeyBetween(
            siblings[prevIndex]?.position,
            siblings[nextIndex]?.position,
          ),
          updated_at: new Date().toISOString(),
        });
      });
    },

    async deleteScene(id) {
      const now = new Date().toISOString();
      await props.db.scenes.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    },
  };

  return (
    <ScenesContext.Provider value={value}>
      {props.children}
    </ScenesContext.Provider>
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

function listScenesByBook(scenes: DbTypes.ScenesTable, bookId: string) {
  return scenes
    .where('book_id')
    .equals(bookId)
    .and((s) => s.deleted_at === null)
    .sortBy('position');
}
