import type { DatabaseError } from '@/renderer/core/database';
import { Task } from '@/shared/utils/task';
import type { BookNotFoundError, BookNotInProjectError } from '../books';
import type { ProjectNotFoundError } from '../projects';
import type { SceneNotFoundError, SceneNotInBookError } from '../scenes';

export class NoActiveProjectError extends Task.Error('noActiveProject') {
  constructor(readonly bookId: string) {
    super(`Cannot select book "${bookId}" without an active project`);
  }
}

export class NoActiveBookError extends Task.Error('noActiveBook') {
  constructor(readonly sceneId: string) {
    super(`Cannot select scene "${sceneId}" without an active book`);
  }
}

export type SelectProjectError =
  ProjectNotFoundError | BookNotFoundError | DatabaseError;

export type SelectBookError =
  | NoActiveProjectError
  | ProjectNotFoundError
  | BookNotFoundError
  | DatabaseError
  | BookNotInProjectError;

export type SelectSceneError =
  | NoActiveProjectError
  | NoActiveBookError
  | ProjectNotFoundError
  | BookNotFoundError
  | SceneNotFoundError
  | DatabaseError
  | BookNotInProjectError
  | SceneNotInBookError;
