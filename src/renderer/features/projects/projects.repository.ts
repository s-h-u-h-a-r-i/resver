import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { ProjectNotFoundError } from './projects.errors';

export interface ListProjectsOptions {
  includeTombstones?: boolean;
  orderBy?: 'createdAt' | 'updatedAt' | 'title';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

const orderFields = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  title: 'title',
} as const;

export const ProjectRepository = {
  list: Task.fn(
    async (
      projects: DbTypes.ProjectsTable,
      options: ListProjectsOptions = {},
    ) => {
      const rows = await projects.toArray();
      return applyListOptions(rows, options);
    },
  ),

  get: Task.fn(async (projects: DbTypes.ProjectsTable, id: string) => {
    const project = await projects.get(id);
    return project ?? Result.err(new ProjectNotFoundError(id));
  }),

  add: Task.fn(
    async (projects: DbTypes.ProjectsTable, project: DbTypes.ProjectInsert) => {
      await projects.add(project);
    },
  ),

  update: Task.fn(
    async (
      projects: DbTypes.ProjectsTable,
      id: string,
      changes: DbTypes.ProjectUpdate,
    ) => {
      const updatedCount = await projects.update(id, changes);
      if (updatedCount === 0) {
        return Result.err(new ProjectNotFoundError(id));
      }
    },
  ),
} as const;

function applyListOptions(
  projects: DbTypes.LocalProject[],
  options: ListProjectsOptions,
) {
  const orderField = orderFields[options.orderBy ?? 'createdAt'];
  const direction = options.direction === 'descending' ? -1 : 1;
  const offset = Math.max(0, options.offset ?? 0);
  const limit =
    options.limit === undefined ? undefined : Math.max(0, options.limit);

  const ordered = projects
    .filter(
      (project) => options.includeTombstones || project.deleted_at === null,
    )
    .sort(
      (left, right) =>
        left[orderField].localeCompare(right[orderField]) * direction,
    );

  return ordered.slice(
    offset,
    limit === undefined ? undefined : offset + limit,
  );
}
