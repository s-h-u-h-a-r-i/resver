import { Component, type JSX } from 'solid-js';

import styles from './chip.module.scss';

interface Props {
  children: JSX.Element;
  class?: string;
}

export const Chip: Component<Props> = (props) => (
  <span class={`${styles.root} ${props.class ?? ''}`}>{props.children}</span>
);
