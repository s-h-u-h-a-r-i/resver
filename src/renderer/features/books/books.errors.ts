import { Result } from '@/shared/utils/result';

export class BookNotFoundError extends Result.Error('bookNotFound') {
  constructor(readonly bookId: string) {
    super(`Book "${bookId}" not found`);
  }
}

export class BookNotInProjectError extends Result.Error('bookNotInProject') {
  constructor(
    readonly bookId: string,
    readonly projectId: string,
  ) {
    super(`Book "${bookId}" does not belong to project "${projectId}"`);
  }
}
