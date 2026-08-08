import {
  createContext,
  Show,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';

import type * as DbTypes from '@/shared/db';
import { createLiveQuery } from '@/shared/db';
import { omitUndefined } from '@/shared/utils/omit-undefined';
import { PageLoading } from '../../components/ui/page-loading';

type CreateProjectInput = Pick<
  DbTypes.LocalProjectCamel,
  'title' | 'description'
>;
type UpdateProjectInput = Partial<
  Pick<DbTypes.LocalProjectCamel, 'title' | 'description'>
>;

interface ProjectsContextValue {
  projects: Accessor<DbTypes.LocalProject[]>;

  createProject(input: CreateProjectInput): Promise<string>;
  updateProject(id: string, input: UpdateProjectInput): Promise<void>;
  deleteProject(id: string): Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue>();

export const ProjectsProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const projects = createLiveQuery(() =>
    props.db.projects.filter((p) => p.deleted_at === null).sortBy('created_at'),
  );

  const actions: Omit<ProjectsContextValue, 'projects'> = {
    async createProject(input) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await props.db.projects.add({
        id,
        title: input.title,
        description: input.description,
        last_visited_book_id: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      });
      return id;
    },

    async updateProject(id, input) {
      await props.db.projects.update(
        id,
        omitUndefined<DbTypes.ProjectUpdate>({
          title: input.title,
          description: input.description,
          updated_at: new Date().toISOString(),
        }),
      );
    },

    async deleteProject(id) {
      const now = new Date().toISOString();
      await props.db.projects.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    },
  };

  return (
    <Show
      when={projects()}
      fallback={<PageLoading reason="Loading projects" />}>
      {(loadedProjects) => (
        <ProjectsContext.Provider
          value={{ projects: loadedProjects, ...actions }}>
          {props.children}
        </ProjectsContext.Provider>
      )}
    </Show>
  );
};

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error(
      `${useProjects.name} must be used within ${ProjectsProvider.name}`,
    );
  }
  return ctx;
}
