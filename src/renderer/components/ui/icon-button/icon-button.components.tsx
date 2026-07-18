import { Component, type JSX } from 'solid-js';

import styles from './icon-button.module.scss';

interface Props {
  icon: JSX.Element;
  label: string;
  variant?: 'ghost' | 'accent' | 'danger';
  disabled?: boolean;
  class?: string;
  ariaExpanded?: boolean;
  onClick?(e: MouseEvent): void;
}

export const IconButton: Component<Props> = (props) => (
  <button
    type="button"
    class={`${styles.root} ${props.class ?? ''}`}
    classList={{
      [styles.accent!]: props.variant === 'accent',
      [styles.danger!]: props.variant === 'danger',
    }}
    title={props.label}
    aria-label={props.label}
    aria-expanded={props.ariaExpanded}
    disabled={props.disabled}
    onClick={(e) => props.onClick?.(e)}>
    {props.icon}
  </button>
);
