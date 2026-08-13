import { Task } from '@/shared/utils/task';
import type { DatabaseError } from '@/renderer/core/database';
import type { BookNotFoundError, BookNotInProjectError } from '../books';
import type { ProjectNotFoundError } from '../projects';
import type { SceneNotFoundError, SceneNotInBookError } from '../scenes';

export class MissingBookReferenceError extends Task.Error(
  'missingBookReference',
) {
  constructor(
    readonly projectId: string,
    readonly bookId: string,
  ) {
    super(`Project "${projectId}" references missing book "${bookId}"`);
  }
}

export class MissingSceneReferenceError extends Task.Error(
  'missingSceneReference',
) {
  constructor(
    readonly bookId: string,
    readonly sceneId: string,
  ) {
    super(`Book "${bookId}" references missing scene "${sceneId}"`);
  }
}

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

export type ResolveRememberedBookError =
  MissingBookReferenceError | BookNotInProjectError;

export type ResolveRememberedSceneError =
  MissingSceneReferenceError | SceneNotInBookError;

export type SelectProjectError =
  | ProjectNotFoundError
  | BookNotFoundError
  | DatabaseError
  | ResolveRememberedBookError
  | ResolveRememberedSceneError;

export type SelectBookError =
  | NoActiveProjectError
  | ProjectNotFoundError
  | BookNotFoundError
  | DatabaseError
  | BookNotInProjectError
  | ResolveRememberedSceneError;

export type SelectSceneError =
  | NoActiveProjectError
  | NoActiveBookError
  | ProjectNotFoundError
  | BookNotFoundError
  | SceneNotFoundError
  | DatabaseError
  | BookNotInProjectError
  | SceneNotInBookError;
