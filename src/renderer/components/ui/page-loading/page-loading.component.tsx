import type { Component } from 'solid-js';

import styles from './page-loading.module.scss';

interface PageLoadingProps {
  reason: string;
}

export const PageLoading: Component<PageLoadingProps> = (props) => (
  <main class={styles.root} role="status" aria-live="polite">
    <img
      class={styles.logo}
      src="/logo-512.png"
      alt=""
      width="112"
      height="112"
    />
    <span class={styles.label}>{props.reason}</span>
  </main>
);
