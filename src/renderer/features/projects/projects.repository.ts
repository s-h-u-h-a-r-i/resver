import type * as DbTypes from '@/renderer/core/database';
import { Result, Task } from '@/shared/utils/task';
import { ProjectNotFoundError } from './projects.errors';

export interface ListProjectsOptions {
  orderBy?: 'updated_at';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

export const ProjectRepository = {
  list: Task.fn(
    async (
      projects: DbTypes.ProjectsTable,
      options: ListProjectsOptions = {},
    ) => {
      let collection = options.orderBy
        ? projects.orderBy(options.orderBy)
        : projects.toCollection();

      collection = collection.filter(
        (project) => project.deleted_at === null,
      );

      if (options.direction === 'descending') {
        collection = collection.reverse();
      }

      if (options.offset !== undefined) {
        collection = collection.offset(Math.max(0, options.offset));
      }

      if (options.limit !== undefined) {
        collection = collection.limit(Math.max(0, options.limit));
      }

      return collection.toArray();
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
