import { liveQuery } from 'dexie';
import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  type Accessor,
} from 'solid-js';

interface LiveQueryOptionsWithInitial<D, T> {
  initial: T;
  dep?: Accessor<D>;
}

interface LiveQueryOptions<D, T> {
  initial?: T;
  dep?: Accessor<D>;
}

export function createLiveQuery<D, T>(
  querier: (deps: D) => T | Promise<T>,
  options: LiveQueryOptionsWithInitial<D, T>,
): Accessor<T>;
export function createLiveQuery<D, T>(
  querier: (deps: D) => T | Promise<T>,
  options?: LiveQueryOptions<D, T>,
): Accessor<T | undefined>;
export function createLiveQuery<D, T>(
  querier: (deps: D) => T | Promise<T>,
  options?: LiveQueryOptionsWithInitial<D, T> | LiveQueryOptions<D, T>,
): Accessor<T | undefined> {
  const { initial, dep } = options ?? {};

  const [value, setValue] = createSignal(initial);

  if (dep) {
    createEffect(
      on(
        dep,
        (currentDep) => {
          const subscription = liveQuery(() => querier(currentDep)).subscribe({
            next(value) {
              setValue(() => value);
            },
            error(reason) {
              console.error(reason);
              throw reason;
            },
          });
          onCleanup(() => subscription.unsubscribe());
        },
        { defer: false },
      ),
    );
  } else {
    createEffect(() => {
      const subscription = liveQuery(() => querier(undefined as D)).subscribe({
        next(value) {
          setValue(() => value);
        },
        error(reason) {
          console.error(reason);
          throw reason;
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  return value;
}
