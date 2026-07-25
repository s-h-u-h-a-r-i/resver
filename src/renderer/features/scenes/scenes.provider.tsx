import {
  createContext,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import {
  createLiveQuery,
  sceneRepository,
  type CreateSceneInput,
  type LocalScene,
  type UpdateSceneInput,
} from '@/shared/db';
import { generateKeyBetween } from '@/shared/utils/fractional-indexing';

interface ScenesContextValue {
  scenes: Accessor<LocalScene[]>;

  createScene(input: Omit<CreateSceneInput, 'position'>): Promise<void>;
  updateScene(
    id: string,
    input: Omit<UpdateSceneInput, 'position'>,
  ): Promise<void>;
  moveScene(id: string, nextSceneId?: string): Promise<void>;
  deleteScene(id: string): Promise<void>;
}

const ScenesContext = createContext<ScenesContextValue>();

export const ScenesProvider: ParentComponent = (props) => {
  const scenes = createLiveQuery(sceneRepository.list, { initial: [] });

  const value: ScenesContextValue = {
    scenes,

    async createScene(input) {
      const bookScenes = await sceneRepository.listByBook(input.bookId);
      const position = generateKeyBetween(
        bookScenes[bookScenes.length - 1]?.position,
        undefined,
      );
      await sceneRepository.create({ ...input, position });
    },

    async updateScene(id, input) {
      await sceneRepository.update(id, input);
    },

    async moveScene(id, nextSceneId) {
      const scene = scenes().find((s) => s.id === id);
      if (!scene) return;

      const siblings = (await sceneRepository.listByBook(scene.book_id)).filter(
        (s) => s.id !== id,
      );

      let position: string;
      if (nextSceneId) {
        const nextIndex = siblings.findIndex((s) => s.id === nextSceneId);
        if (nextIndex === -1) return;
        const next = siblings[nextIndex];
        const prev = siblings[nextIndex - 1];
        position = generateKeyBetween(prev?.position, next.position);
      } else {
        const last = siblings[siblings.length - 1];
        position = generateKeyBetween(last?.position, undefined);
      }

      await sceneRepository.update(id, { position });
    },

    async deleteScene(id) {
      await sceneRepository.softDelete(id);
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
