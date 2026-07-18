import { Component } from 'solid-js';

import styles from './text-area.module.scss';

interface Props {
  value: string;
  onInput(v: string): void;
  placeHolder?: string;
  rows?: number;
  class?: string;
}

export const TextArea: Component<Props> = (props) => (
  <textarea
    class={`${styles.root} ${props.class ?? ''}`}
    rows={props.rows ?? 3}
    value={props.value}
    placeholder={props.placeHolder}
    onInput={(e) => props.onInput(e.currentTarget.value)}
  />
);
