import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { usePersistentSession } from '@/src/auth';
import { SessionTokenSync } from '@/src/components/session-token-sync';
import { Spinner } from '@/src/components/spinner';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data, isPending } = usePersistentSession();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === '(auth)';
  const isSharedView = segments[0] === 's';
  const isPublicView = isSharedView || segments[0] === 'privacy';

  useEffect(() => {
    if (isPending || isPublicView) return;
    if (!data?.user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (data?.user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [data?.user, inAuthGroup, isPending, isPublicView, router]);

  if (isPending && !isPublicView) {
    return <Spinner label="Loading..." />;
  }

  return children;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <SessionTokenSync />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy Policy' }} />
          <Stack.Screen name="s/[token]" options={{ headerShown: true, title: 'Shared list' }} />
        </Stack>
      </AuthGate>
    </>
  );
}
