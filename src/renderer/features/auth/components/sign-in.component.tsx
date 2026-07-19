import { Component, createSignal } from 'solid-js';

import { TextInput } from '@/renderer/components/ui/text-input';
import styles from './sign-in.module.scss';

interface Props {
  signIn(email: string, password: string): Promise<string | null>;
}

export const SignIn: Component<Props> = (props) => {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const message = await props.signIn(email(), password());
      if (message) setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class={styles.root}>
      <form class={styles.card} onSubmit={submit}>
        <p class={styles.brand}>Resver</p>
        <h1 class={styles.title}>A quite place to write</h1>
        <TextInput
          type="email"
          value={email()}
          onInput={setEmail}
          placeHolder="email"
        />
        <TextInput
          type="password"
          value={password()}
          onInput={setPassword}
          placeHolder="Password"
        />
        {error() && <p class={styles.error}>{error()}</p>}
        <button type="submit" class={styles.submit} disabled={submitting()}>
          {submitting() ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};
