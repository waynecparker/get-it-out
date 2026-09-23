import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, PropsWithChildren, use, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface AuthResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        if (data.session && data.user) {
          // The 18+ confirmation checkbox is required to reach this call —
          // record it now while we still have an authenticated session.
          await supabase.from('profiles').update({ age_confirmed: true }).eq('id', data.user.id);
        }
        // New Supabase projects require email confirmation by default — in
        // that case signUp succeeds but no session exists yet, so the
        // profiles update above is skipped until Checkpoint 5 revisits
        // first-login bootstrapping.
        return { error: null, needsEmailConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async resetPassword(email) {
        // Linking.createURL resolves to the right thing in both
        // environments: exp://<lan-ip>:<port>/--/reset-password in Expo
        // Go during development, getitout://reset-password in a real
        // build. Either way, it must be added to Authentication → URL
        // Configuration → Redirect URLs in the Supabase dashboard.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Linking.createURL('reset-password'),
        });
        return { error: error?.message ?? null };
      },
    }),
    [session, isLoading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
