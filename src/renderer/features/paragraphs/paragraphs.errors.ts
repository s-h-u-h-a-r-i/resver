import { Task } from '@/shared/utils/task';

export class ParagraphNotFoundError extends Task.Error('paragraphNotFound') {
  constructor(readonly paragraphId: string) {
    super(`Paragraph "${paragraphId}" not found`);
  }
}

export class ParagraphNotInSceneError extends Task.Error(
  'paragraphNotInScene',
) {
  constructor(
    readonly paragraphId: string,
    readonly sceneId: string,
  ) {
    super(`Paragraph "${paragraphId}" does not belong to scene "${sceneId}"`);
  }
}

export class InvalidParagraphMoveError extends Task.Error(
  'invalidParagraphMove',
) {
  constructor(readonly paragraphId: string) {
    super(
      `Paragraph "${paragraphId}" cannot be moved between the supplied boundaries`,
    );
  }
}
