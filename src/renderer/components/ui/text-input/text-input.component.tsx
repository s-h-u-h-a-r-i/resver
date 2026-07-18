import { Component, type JSX } from 'solid-js';

import styles from './text-input.module.scss';

interface Props {
  value: string;
  onInput(v: string): void;
  class?: string;
  placeHolder?: string;
  type?: JSX.InputHTMLAttributes<HTMLInputElement>['type'];
}

export const TextInput: Component<Props> = (props) => (
  <input
    class={`${styles.root} ${props.class ?? ''}`}
    type={props.type ?? 'text'}
    value={props.value}
    placeholder={props.placeHolder}
    onInput={(e) => props.onInput(e.currentTarget.value)}
  />
);
