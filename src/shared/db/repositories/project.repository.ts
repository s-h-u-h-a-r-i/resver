import { UpdateSpec, type InsertType } from 'dexie';

import { omitUndefined } from '@/shared/utils/omit-undefined';
import { db, type AppDatabase } from '../client';
import type { LocalProject } from '../types';

type ProjectInsert = InsertType<LocalProject, 'id'>;

export interface CreateProjectInput {
  title: string;
}

export type UpdateProjectInput = Partial<
  Pick<LocalProject, 'title' | 'description'>
>;

export const projectRepository = createProjectRepository(db);

function createProjectRepository(db: AppDatabase) {
  return {
    get(id: string) {
      return db.projects.get(id);
    },

    list() {
      return db.projects
        .filter((p) => p.deleted_at === null)
        .sortBy('created_at');
    },

    create(input: CreateProjectInput) {
      const now = new Date().toISOString();
      const project: ProjectInsert = {
        id: crypto.randomUUID(),
        title: input.title,
        description: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      };
      return db.projects.add(project);
    },

    update(id: string, input: UpdateProjectInput) {
      return db.projects.update(
        id,
        omitUndefined<UpdateSpec<ProjectInsert>>({
          title: input.title,
          description: input.description,
          updated_at: new Date().toISOString(),
        }),
      );
    },

    softDelete(id: string) {
      return db.projects.update(id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
  };
}
