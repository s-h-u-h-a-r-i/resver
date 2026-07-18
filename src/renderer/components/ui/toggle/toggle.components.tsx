import { Component } from 'solid-js';

import styles from './toggle.module.scss';

interface Props {
  checked: boolean;
  label: string;
  onChange(v: boolean): void;
  class?: string;
}

export const Toggle: Component<Props> = (props) => (
  <button
    type="button"
    role="switch"
    aria-checked={props.checked}
    aria-label={props.label}
    class={`${styles.root} ${props.class ?? ''}`}
    classList={{ [styles.on]: props.checked }}
    onClick={() => props.onChange(!props.checked)}
  />
);
