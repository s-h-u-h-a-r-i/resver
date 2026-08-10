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
import { omitUndefined } from '@/shared/utils/omit-undefined';
import { Task, type ResultType } from '@/shared/utils/task';
import { PageLoading } from '../../components/ui/page-loading';
import { ProjectNotFoundError } from './projects.errors';
import { ProjectRepository } from './projects.repository';

type CreateProjectInput = Pick<
  DbTypes.LocalProjectCamel,
  'title' | 'description'
>;
type UpdateProjectInput = Partial<
  Pick<DbTypes.LocalProjectCamel, 'title' | 'description'>
>;

interface ProjectsContextValue {
  projects: Accessor<DbTypes.LocalProject[]>;

  createProject(input: CreateProjectInput): Promise<ResultType<string>>;
  updateProject(
    id: string,
    input: UpdateProjectInput,
  ): Promise<ResultType<void, ProjectNotFoundError>>;
  deleteProject(id: string): Promise<ResultType<void, ProjectNotFoundError>>;
}

const ProjectsContext = createContext<ProjectsContextValue>();

export const ProjectsProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const projects = createLiveQuery(() =>
    ProjectRepository.list(database.projects).pipe(Task.runOrThrow),
  );

  const actions: Omit<ProjectsContextValue, 'projects'> = {
    createProject(input) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      return ProjectRepository.add(database.projects, {
        id,
        title: input.title,
        description: input.description,
        last_visited_book_id: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      }).pipe(
        Task.map(() => id),
        Task.run,
      );
    },

    updateProject(id, input) {
      return ProjectRepository.update(
        database.projects,
        id,
        omitUndefined<DbTypes.ProjectUpdate>({
          title: input.title,
          description: input.description,
          updated_at: new Date().toISOString(),
        }),
      ).pipe(Task.run);
    },

    deleteProject(id) {
      const now = new Date().toISOString();
      return ProjectRepository.update(database.projects, id, {
        deleted_at: now,
        updated_at: now,
      }).pipe(Task.run);
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
