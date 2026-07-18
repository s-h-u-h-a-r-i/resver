import { Component, type JSX } from 'solid-js';

import styles from './avatar.module.scss';

interface Props {
  children: JSX.Element;
  size?: number;
  class?: string;
}

export const Avatar: Component<Props> = (props) => (
  <span
    class={`${styles.root} ${props.class ?? ''}`}
    style={{ width: `${props.size ?? 34}px`, height: `${props.size ?? 34}px` }}>
    {props.children}
  </span>
);
