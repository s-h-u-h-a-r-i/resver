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
import { Task, TaskArray } from '@/shared/utils/task';
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

  createProject(input: CreateProjectInput): Task<string>;
  updateProject(
    id: string,
    input: UpdateProjectInput,
  ): Task<void, ProjectNotFoundError>;
  deleteProject(id: string): Task<void, ProjectNotFoundError>;
}

const ProjectsContext = createContext<ProjectsContextValue>();

export const ProjectsProvider: ParentComponent<{ db: DbTypes.AppDatabase }> = (
  props,
) => {
  const database = untrack(() => props.db);
  const projects = createLiveQuery(() =>
    ProjectRepository.list(database.projects).pipe(
      TaskArray.sortByString('created_at'),
      Task.run,
    ),
  );

  const actions: Omit<ProjectsContextValue, 'projects'> = {
    createProject: (input) => createProject(database, input),
    updateProject: (id, input) => updateProject(database, id, input),
    deleteProject: (id) => deleteProject(database, id),
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

const createProject = (
  database: DbTypes.AppDatabase,
  input: CreateProjectInput,
): Task<string> => {
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
  }).pipe(Task.map(() => id));
};

const updateProject = Task.fn(
  (
    database: DbTypes.AppDatabase,
    projectId: string,
    input: UpdateProjectInput,
  ) =>
    database.transaction('rw', database.projects, (transaction) =>
      Task.gen(function* () {
        yield* requireActiveProject(transaction.projects, projectId);

        yield* ProjectRepository.update(
          transaction.projects,
          projectId,
          omitUndefined<DbTypes.ProjectUpdate>({
            title: input.title,
            description: input.description,
            updated_at: new Date().toISOString(),
          }),
        );
      }).pipe(Task.runResult),
    ),
);

const deleteProject = Task.fn(
  (database: DbTypes.AppDatabase, projectId: string) =>
    database.transaction('rw', database.projects, (transaction) =>
      Task.gen(function* () {
        yield* requireActiveProject(transaction.projects, projectId);

        const now = new Date().toISOString();
        yield* ProjectRepository.update(transaction.projects, projectId, {
          deleted_at: now,
          updated_at: now,
        });
      }).pipe(Task.runResult),
    ),
);

const requireActiveProject = (
  projects: DbTypes.ProjectsTable,
  projectId: string,
) =>
  Task.gen(function* () {
    const project = yield* ProjectRepository.get(projects, projectId);
    if (project.deleted_at !== null) {
      return yield* Task.fail(new ProjectNotFoundError(projectId));
    }
    return project;
  });
