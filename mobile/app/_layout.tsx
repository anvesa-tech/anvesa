import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/presentation/design-system/ThemeProvider';
import { useAuthStore } from '@/application/authStore';
import { supabase, signInAsGuest } from '@/infrastructure/auth/supabase';
import { syncSession } from '@/infrastructure/api/ordersApi';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/**
 * Ensures an authenticated session on launch. If there's no session, it starts
 * a Supabase anonymous (guest) session so cart/checkout/orders persist to the
 * backend. Requires "Anonymous sign-ins" enabled in Supabase → Auth → Providers.
 */
function useSessionBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      let session = data.session;
      if (!session) {
        const { data: guest, error } = await signInAsGuest();
        if (error) {
          // Anonymous provider likely disabled; browsing still works.
          // eslint-disable-next-line no-console
          console.warn('Guest sign-in unavailable:', error.message);
        } else {
          session = guest.session ?? null;
        }
      }
      if (!active) return;
      setSession(session);
      if (session) {
        try {
          await syncSession();
        } catch {
          /* non-fatal */
        }
      }
      supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    })();
    return () => {
      active = false;
    };
  }, [setSession]);
}

export default function RootLayout() {
  useSessionBootstrap();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
