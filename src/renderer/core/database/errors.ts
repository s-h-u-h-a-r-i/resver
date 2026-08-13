import { Task } from '@/shared/utils/task';

export class DatabaseError extends Task.Error('database') {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Database operation failed');
  }

  static from(cause: unknown) {
    return cause instanceof DatabaseError ? cause : new DatabaseError(cause);
  }
}
