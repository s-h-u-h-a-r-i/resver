import {
  createContext,
  createMemo,
  createSignal,
  onMount,
  Show,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/shared/db';
import { useBooks } from '../books';
import { useProjects } from '../projects';
import { useScenes } from '../scenes';

interface WorkspaceContextValue {
  selectedScene: Accessor<DbTypes.LocalScene>;
  currentBook: Accessor<DbTypes.LocalBook>;
  currentProject: Accessor<DbTypes.LocalProject>;

  selectScene(id: string): void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>();

export const WorkspaceProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const { projects } = useProjects();
  const { books } = useBooks();
  const { scenes } = useScenes();

  const [selectedSceneId, setSelectedSceneId] = createSignal<string | null>();

  const selectedScene = createMemo(() => {
    const sceneId = selectedSceneId();
    const allScenes = scenes();
    if (!sceneId) return null;
    return allScenes.find((scene) => scene.id === sceneId) ?? null;
  });

  const currentBook = createMemo(() => {
    const scene = selectedScene();
    const allBooks = books();
    if (!scene) return null;
    const bookForScene = allBooks.find((book) => book.id === scene.book_id);
    return bookForScene ?? null;
  });

  const currentProject = createMemo(() => {
    const book = currentBook();
    const allProjects = projects();
    if (!book) return null;
    const project = allProjects.find((p) => p.id === book.project_id);
    return project ?? null;
  });

  const combinedWorkspaceData = createMemo(() => {
    const scene = selectedScene();
    const book = currentBook();
    const project = currentProject();

    if (!scene || !book || !project) return null;

    return {
      selectedScene: () => scene,
      currentBook: () => book,
      currentProject: () => project,
    };
  });

  const selectScene = (id: string) => {
    const allScenes = scenes();
    if (!allScenes.some((scene) => scene.id === id)) {
      throw new Error(`Scene with id "${id}" not found`);
    }
    setSelectedSceneId(id);
  };

  onMount(async () => {
    const mostRecentlyUpdatedScene = await props.db.scenes
      .orderBy('updated_at')
      .filter((s) => s.deleted_at === null)
      .last();
    setSelectedSceneId(mostRecentlyUpdatedScene?.id ?? null);
  });

  return (
    <Show
      when={selectedSceneId() !== undefined}
      fallback={<h1>Loading shit</h1>}>
      <Show
        when={combinedWorkspaceData()}
        fallback={
          <h1>
            No scenes means no projects so we need a way to allow user to create
            project with filler book and scene
          </h1>
        }>
        {(data) => (
          <WorkspaceContext.Provider
            value={{
              selectedScene: data().selectedScene,
              currentBook: data().currentBook,
              currentProject: data().currentProject,

              selectScene,
            }}>
            {props.children}
          </WorkspaceContext.Provider>
        )}
      </Show>
    </Show>
  );
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      `${useWorkspace.name} must be used withing ${WorkspaceProvider.name}`,
    );
  }
  return ctx;
}
