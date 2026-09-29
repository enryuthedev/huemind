import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/theme';
import type { ModeId } from '@/src/types';
import { MODES, MODE_ORDER, isModeLocked, playableMode } from '@/src/constants/modes';
import { usePremium } from '@/src/services/purchases';
import { useStore } from '@/src/store/useStore';
import { ScreenContainer, CONTENT_MAX_WIDTH } from '@/src/components/ScreenContainer';
import { AppHeader } from '@/src/components/AppHeader';
import { AppText } from '@/src/components/AppText';
import { ModeCard } from '@/src/components/ModeCard';
import { AppButton } from '@/src/components/AppButton';

/** Initial footer reserve before the real height has been measured. */
const FOOTER_ESTIMATE = 120;

/**
 * Mode-selection screen. Lists the difficulty modes in their stable order as
 * selectable cards, seeding the local selection from the persisted store. A
 * fixed bottom button commits the choice to the store and advances to the
 * ready screen. The footer's height is measured so the scroll content always
 * reserves enough room for the last card to clear it.
 */
export default function ModesScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const setMode = useStore((s) => s.setMode);
  const premium = usePremium();
  // A persisted Pro mode (e.g. from before the paywall) falls back to Normal.
  const [selected, setSelected] = useState<ModeId>(() => {
    const state = useStore.getState();
    return playableMode(state.game.selectedMode, state.premium);
  });
  const [footerHeight, setFooterHeight] = useState(FOOTER_ESTIMATE + insets.bottom);
  const starting = useRef(false);

  const padding = theme.spacing.containerPadding;

  const onFooterLayout = (event: LayoutChangeEvent): void => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    if (next > 0 && next !== footerHeight) setFooterHeight(next);
  };

  const openPaywall = (): void => {
    router.push({ pathname: '/paywall', params: { source: 'mode' } });
  };

  const handleSelect = (id: ModeId): void => {
    setSelected(id);
    if (isModeLocked(id, premium)) openPaywall();
  };

  const handleStart = (): void => {
    // Guard against a double tap pushing /ready twice.
    if (starting.current) return;
    if (isModeLocked(selected, premium)) {
      openPaywall();
      return;
    }
    starting.current = true;
    setMode(selected);
    router.push('/ready');
    setTimeout(() => {
      starting.current = false;
    }, 800);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <ScreenContainer
        scroll
        edges={['top']}
        contentStyle={{ paddingBottom: footerHeight + theme.spacing.lg }}
      >
        <AppHeader title={t('modeSelect.title')} showBack />

        <AppText
          variant="body"
          color={theme.colors.textMuted}
          style={{ marginBottom: theme.spacing.lg }}
        >
          {t('modeSelect.subtitle')}
        </AppText>

        <View accessibilityRole="radiogroup">
          {MODE_ORDER.map((id) => (
            <View key={id} style={{ marginBottom: theme.spacing.md }}>
              <ModeCard
                mode={MODES[id]}
                selected={selected === id}
                locked={isModeLocked(id, premium)}
                onPress={() => handleSelect(id)}
              />
            </View>
          ))}
        </View>
      </ScreenContainer>

      <View
        onLayout={onFooterLayout}
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.bg,
            borderTopColor: theme.colors.border,
            paddingHorizontal: padding,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.lg,
          },
        ]}
      >
        <View style={[styles.footerInner, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <AppButton label={t('modeSelect.start')} onPress={handleStart} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerInner: {
    width: '100%',
  },
});
