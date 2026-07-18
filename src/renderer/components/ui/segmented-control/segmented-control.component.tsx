import { For, type JSX } from 'solid-js';

import styles from './segmented-control.module.scss';

export interface SegmentedOption<T extends string> {
  value: T;
  label: JSX.Element;
}

interface Props<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange(v: T): void;
  class?: string;
}

export function SegmentedControl<T extends string>(props: Props<T>) {
  return (
    <div class={`${styles.root} ${props.class ?? ''}`}>
      <For each={props.options}>
        {(opt) => (
          <button
            type="button"
            class={styles.btn}
            classList={{ [styles.on]: opt.value === props.value }}
            onClick={() => props.onChange(opt.value)}>
            {opt.label}
          </button>
        )}
      </For>
    </div>
  );
}
