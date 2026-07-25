import type { Component } from 'solid-js';

import styles from './workspace-loading.module.scss';

export const WorkspaceLoading: Component = () => (
  <div class={styles.root}>
    <img class={styles.logo} src="/logo-512.png" alt="Resver" />
    <span class={styles.label}>Opening your workspace…</span>
  </div>
);
