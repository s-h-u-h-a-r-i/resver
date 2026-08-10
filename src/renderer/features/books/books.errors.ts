import { Task } from '@/shared/utils/task';

export class BookNotFoundError extends Task.Error('bookNotFound') {
  constructor(readonly bookId: string) {
    super(`Book "${bookId}" not found`);
  }
}

export class BookNotInProjectError extends Task.Error('bookNotInProject') {
  constructor(
    readonly bookId: string,
    readonly projectId: string,
  ) {
    super(`Book "${bookId}" does not belong to project "${projectId}"`);
  }
}
