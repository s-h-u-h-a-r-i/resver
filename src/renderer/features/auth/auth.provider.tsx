import { Session, User } from '@supabase/supabase-js';
import {
  Accessor,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  ParentComponent,
  Show,
  useContext,
} from 'solid-js';

import { supabase } from '@/shared/supabase';
import { SignIn } from './components/sign-in.component';

interface AuthContextValue {
  user: Accessor<User>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: ParentComponent = (props) => {
  const [session, setSession] = createSignal<Session | null | undefined>(
    undefined,
  );

  const user = () => session()?.user ?? null;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  onMount(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    onCleanup(() => {
      subscription.unsubscribe();
    });
  });

  return (
    <Show
      when={session() !== undefined}
      fallback={<h1>Loading Session (change this)</h1>}>
      {' '}
      {/* TODO: Implement reusable page loading component */}
      <Show when={user()} fallback={<SignIn signIn={signIn} />}>
        {(u) => (
          <AuthContext.Provider value={{ user: u, signOut }}>
            {props.children}
          </AuthContext.Provider>
        )}
      </Show>
    </Show>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(`${useAuth.name} must be used within ${AuthProvider.name}`);
  }
  return ctx;
}
