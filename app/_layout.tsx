import 'react-native-gesture-handler';
import '@/src/i18n';

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import { useTheme } from '@/src/theme';
import { useStore } from '@/src/store/useStore';
import { initPurchases } from '@/src/services/purchases';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): React.ReactElement | null {
  const theme = useTheme();
  const hydrated = useStore((s) => s.hydrated);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const ready = fontsLoaded && hydrated;
  const bg = theme.colors.bg;

  // Paint the native root view with the in-app theme background so screen
  // transitions / keyboard / rotation never flash white in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(bg).catch(() => undefined);
  }, [bg]);

  useEffect(() => {
    void initPurchases();
  }, []);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaProvider>
        {/* Follow the in-app theme (which may override the OS scheme). */}
        <StatusBar style={theme.colors.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modes" />
          <Stack.Screen name="ready" />
          <Stack.Screen name="game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="result" />
          <Stack.Screen name="daily-summary" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
