import { Task } from '@/shared/utils/task';

export class SceneNotFoundError extends Task.Error('sceneNotFound') {
  constructor(readonly sceneId: string) {
    super(`Scene "${sceneId}" not found`);
  }
}

export class SceneNotInBookError extends Task.Error('sceneNotInBook') {
  constructor(
    readonly sceneId: string,
    readonly bookId: string,
  ) {
    super(`Scene "${sceneId}" does not belong to book "${bookId}"`);
  }
}

export class InvalidSceneMoveError extends Task.Error('invalidSceneMove') {
  constructor(readonly sceneId: string) {
    super(`Scene "${sceneId}" cannot be moved between the supplied boundaries`);
  }
}
