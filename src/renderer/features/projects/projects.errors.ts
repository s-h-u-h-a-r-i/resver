import { Result } from '@/shared/utils/result';

export class ProjectNotFoundError extends Result.Error('projectNotFound') {
  constructor(readonly projectId: string) {
    super(`Project "${projectId}" not found`);
  }
}
