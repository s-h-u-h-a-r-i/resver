import { Result } from '@/shared/utils/result';
import type { BookNotFoundError, BookNotInProjectError } from '../books';
import type { ProjectNotFoundError } from '../projects';
import type { SceneNotFoundError, SceneNotInBookError } from '../scenes';

export class MissingBookReferenceError extends Result.Error(
  'missingBookReference',
) {
  constructor(
    readonly projectId: string,
    readonly bookId: string,
  ) {
    super(`Project "${projectId}" references missing book "${bookId}"`);
  }
}

export class MissingSceneReferenceError extends Result.Error(
  'missingSceneReference',
) {
  constructor(
    readonly bookId: string,
    readonly sceneId: string,
  ) {
    super(`Book "${bookId}" references missing scene "${sceneId}"`);
  }
}

export class NoActiveProjectError extends Result.Error('noActiveProject') {
  constructor(readonly bookId: string) {
    super(`Cannot select book "${bookId}" without an active project`);
  }
}

export class NoActiveBookError extends Result.Error('noActiveBook') {
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
  | ResolveRememberedBookError
  | ResolveRememberedSceneError;

export type SelectBookError =
  | NoActiveProjectError
  | ProjectNotFoundError
  | BookNotFoundError
  | BookNotInProjectError
  | ResolveRememberedSceneError;

export type SelectSceneError =
  | NoActiveProjectError
  | NoActiveBookError
  | ProjectNotFoundError
  | BookNotFoundError
  | SceneNotFoundError
  | BookNotInProjectError
  | SceneNotInBookError;
