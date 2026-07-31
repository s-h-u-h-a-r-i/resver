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
      props.db.scenes.filter((s) => s.deleted_at === null).sortBy('created_at'),
    { initial: [] },
  );

  const value: ScenesContextValue = {
    scenes,

    async createScene(input) {
      const bookScenes = await listScenesByBook(props.db, input.bookId);
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
      const scene = scenes().find((s) => s.id === id);
      if (!scene) return;

      const prevScene = scenes().find(
        (s) => s.id === prevSceneId && s.book_id === scene.book_id,
      );
      const nextScene = scenes().find(
        (s) => s.id === nextSceneId && s.book_id === scene.book_id,
      );

      if (
        prevSceneId === id ||
        nextSceneId === id ||
        (prevSceneId !== undefined && !prevScene) ||
        (nextSceneId !== undefined && !nextScene)
      ) {
        return;
      }

      await props.db.scenes.update(id, {
        position: generateKeyBetween(prevScene?.position, nextScene?.position),
        updated_at: new Date().toISOString(),
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

function listScenesByBook(db: DbTypes.AppDatabase, bookId: string) {
  return db.scenes
    .where('book_id')
    .equals(bookId)
    .and((s) => s.deleted_at === null)
    .sortBy('position');
}
