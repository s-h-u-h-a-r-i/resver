import type * as DbTypes from '@/renderer/core/database';
import { DatabaseError } from '@/renderer/core/database';
import { Task } from '@/shared/utils/task';
import { ProjectNotFoundError } from './projects.errors';

export interface ListProjectsOptions {
  orderBy?: 'updated_at';
  direction?: 'ascending' | 'descending';
  offset?: number;
  limit?: number;
}

export const ProjectRepository = {
  list: Task.fn(function* (
    projects: DbTypes.ProjectsTable,
    options: ListProjectsOptions = {},
  ) {
    let collection = options.orderBy
      ? projects.orderBy(options.orderBy)
      : projects.toCollection();

    collection = collection.filter((project) => project.deleted_at === null);

    if (options.direction === 'descending') {
      collection = collection.reverse();
    }

    if (options.offset !== undefined) {
      collection = collection.offset(Math.max(0, options.offset));
    }

    if (options.limit !== undefined) {
      collection = collection.limit(Math.max(0, options.limit));
    }

    return yield* Task.tryPromise(
      () => collection.toArray(),
      DatabaseError.from,
    );
  }),

  get: Task.fn(function* (projects: DbTypes.ProjectsTable, id: string) {
    const project = yield* Task.tryPromise(
      () => projects.get(id),
      DatabaseError.from,
    );
    if (!project) {
      return yield* Task.fail(new ProjectNotFoundError(id));
    }
    return project;
  }),

  add: Task.fn(function* (
    projects: DbTypes.ProjectsTable,
    project: DbTypes.ProjectInsert,
  ) {
    yield* Task.tryPromise(() => projects.add(project), DatabaseError.from);
  }),

  update: Task.fn(function* (
    projects: DbTypes.ProjectsTable,
    id: string,
    changes: DbTypes.ProjectUpdate,
  ) {
    const updatedCount = yield* Task.tryPromise(
      () => projects.update(id, changes),
      DatabaseError.from,
    );
    if (updatedCount === 0) {
      return yield* Task.fail(new ProjectNotFoundError(id));
    }
  }),
} as const;
