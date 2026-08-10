import { Result } from '@/shared/utils/result';

export class SceneNotFoundError extends Result.Error('sceneNotFound') {
  constructor(readonly sceneId: string) {
    super(`Scene "${sceneId}" not found`);
  }
}

export class SceneNotInBookError extends Result.Error('sceneNotInBook') {
  constructor(
    readonly sceneId: string,
    readonly bookId: string,
  ) {
    super(`Scene "${sceneId}" does not belong to book "${bookId}"`);
  }
}
