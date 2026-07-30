import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/infrastructure/auth/supabase';

interface AuthState {
  session: Session | null;
  initialized: boolean;
  userId: string | null;
  setSession: (session: Session | null) => void;
  init: () => void;
}

/**
 * Auth session state backed by Supabase. Subscribes to Supabase auth changes
 * so the app reacts to sign-in / sign-out / token refresh.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,
  userId: null,
  setSession: (session) => set({ session, userId: session?.user.id ?? null }),
  init: () => {
    void supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, userId: data.session?.user.id ?? null, initialized: true });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, userId: session?.user.id ?? null });
    });
  },
}));
