import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';
import { BrandLogo } from '@/src/components/BrandLogo';

/**
 * Splash screen. Fades in the brand mark, app name and tagline over a warm
 * background, then hands off to the home tab after a short beat. The redirect
 * timer is cleared on unmount so navigating away can never fire it twice.
 */
export default function SplashScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    });
    animation.start();

    const timeout = setTimeout(() => {
      router.replace('/home');
    }, 1500);

    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [fade, router]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <BrandLogo size={112} />
        <AppText variant="display" align="center" style={styles.appName}>
          {t('common.appName')}
        </AppText>
        <AppText
          variant="bodyLg"
          color={theme.colors.textMuted}
          align="center"
        >
          {t('splash.tagline')}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
  },
  appName: {
    marginTop: 28,
    marginBottom: 8,
  },
});
