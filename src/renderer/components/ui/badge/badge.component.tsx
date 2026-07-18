import { Component, type JSX } from 'solid-js';

import styles from './badge.module.scss';

interface Props {
  children: JSX.Element;
  class?: string;
}

export const Badge: Component<Props> = (props) => (
  <span class={`${styles.root} ${props.class ?? ''}`}>{props.children}</span>
);
