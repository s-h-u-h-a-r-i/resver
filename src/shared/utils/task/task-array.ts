import { Task } from './task';

export const TaskArray = {
  sortByString,
} as const;

function sortByString<const Key extends PropertyKey>(key: Key) {
  return <Item extends Record<Key, string>, E>(
    task: Task<Item[], E>,
  ): Task<Item[], E> =>
    Task.map((items: Item[]) =>
      items
        .slice()
        .sort((left, right) => left[key].localeCompare(right[key])),
    )(task);
}
