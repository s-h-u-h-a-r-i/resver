import { createSignal, type Component } from 'solid-js';

import { TextArea } from '@/renderer/components/ui/text-area';
import { TextInput } from '@/renderer/components/ui/text-input';
import styles from './workspace-onboarding.module.scss';

interface Props {
  onSubmit(input: { title: string; description: string | null }): Promise<void>;
}

export const WorkspaceOnboarding: Component<Props> = (props) => {
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmedTitle = title().trim();
    if (!trimmedTitle || submitting()) return;

    setSubmitting(true);
    const trimmedDescription = description().trim();
    await props.onSubmit({
      title: trimmedTitle,
      description: trimmedDescription || null,
    });
  };

  return (
    <div class={styles.root}>
      <img class={styles.logo} src="/logo-512.png" alt="Resver" />
      <form class={styles.form} onSubmit={handleSubmit}>
        <label class={styles.label}>
          Name your project
          <TextInput
            value={title()}
            onInput={setTitle}
            placeHolder="Working title"
          />
        </label>
        <label class={styles.label}>
          Description (optional)
          <TextArea
            value={description()}
            onInput={setDescription}
            placeHolder="What's this project about?"
            rows={2}
          />
        </label>
        <button
          type="submit"
          class={styles.submit}
          disabled={!title().trim() || submitting()}>
          Start writing
        </button>
      </form>
    </div>
  );
};
