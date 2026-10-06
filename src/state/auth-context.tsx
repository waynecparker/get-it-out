import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, PropsWithChildren, use, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { runActiveConversationCleanup } from '@/state/active-conversation-cleanup';

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
  deleteAccount: () => Promise<AuthResult>;
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
        // The 18+ confirmation checkbox is required to reach this call. It
        // travels as signup metadata and the handle_new_user trigger saves
        // it to profiles.age_confirmed — this works even when email
        // confirmation means no session exists yet.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { age_confirmed: true } },
        });
        if (error) return { error: error.message };
        return { error: null, needsEmailConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        runActiveConversationCleanup();
        await supabase.auth.signOut();
      },
      async deleteAccount() {
        const { error } = await supabase.functions.invoke('delete-account');
        if (error) return { error: error.message };
        runActiveConversationCleanup();
        // The account is already gone server-side — this just clears the
        // now-invalid local session.
        await supabase.auth.signOut();
        return { error: null };
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
