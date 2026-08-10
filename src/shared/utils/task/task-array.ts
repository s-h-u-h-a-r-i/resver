import { Task, type Task as TaskType } from './task';

export const TaskArray = {
  sortByString,
} as const;

function sortByString<const Key extends PropertyKey>(key: Key) {
  return <Item extends Record<Key, string>, E>(
    task: TaskType<Item[], E>,
  ): TaskType<Item[], E> =>
    Task.map((items: Item[]) =>
      items
        .slice()
        .sort((left, right) => left[key].localeCompare(right[key])),
    )(task);
}
