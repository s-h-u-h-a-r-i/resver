import {
  Task,
  type AnyTask,
  type NormalizedTask,
  type TaskFailure,
  type TaskSuccess,
} from './task';

export const TaskQueue = {
  make: makeTaskQueue,
} as const;

function makeTaskQueue() {
  let tail = Promise.resolve();

  function enqueue<QueuedTask extends AnyTask>(
    createTask: () => QueuedTask,
  ): NormalizedTask<QueuedTask> {
    return Task.make<TaskSuccess<QueuedTask>, TaskFailure<QueuedTask>>(
      async () => {
        const task = createTask() as NormalizedTask<QueuedTask>;
        const result = tail.then(() => task.pipe(Task.runResult));

        tail = result.then(
          () => undefined,
          () => undefined,
        );

        return result;
      },
    );
  }

  return { enqueue };
}
