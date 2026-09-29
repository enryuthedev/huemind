import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

const ROW_HEIGHT = 56;
const SIDE_WIDTH = 44;

/**
 * Top header row with an optionally centered title, a leading back button and
 * a trailing slot. Title defaults to the app name. Light/dark aware.
 */
export function AppHeader({ title, showBack = false, onBack, right }: AppHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.colors.inset,
                borderRadius: theme.radius.full,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
        ) : null}
      </View>

      <AppText
        variant="headlineMd"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        accessibilityRole="header"
        style={styles.title}
      >
        {title ?? t('common.appName')}
      </AppText>

      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    width: SIDE_WIDTH,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
