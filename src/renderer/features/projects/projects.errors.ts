import { Task } from '@/shared/utils/task';

export class ProjectNotFoundError extends Task.Error('projectNotFound') {
  constructor(readonly projectId: string) {
    super(`Project "${projectId}" not found`);
  }
}
