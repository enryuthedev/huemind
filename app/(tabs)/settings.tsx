import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import { AppHeader } from '@/src/components/AppHeader';
import { AppText } from '@/src/components/AppText';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { SettingRow } from '@/src/components/SettingRow';
import { feedback } from '@/src/services/feedback';
import { restorePurchases } from '@/src/services/purchases';
import { PRIVACY_URL, TERMS_URL } from '@/src/constants/links';
import { useStore } from '@/src/store/useStore';
import { useTheme } from '@/src/theme';
import type { Language, ThemeMode } from '@/src/types';

type IconName = keyof typeof MaterialIcons.glyphMap;

/** A labelled group of rows rendered inside a single rounded card surface. */
function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { colors, spacing, radius, shadow } = theme;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      {title ? (
        <AppText
          variant="label"
          color={colors.textMuted}
          accessibilityRole="header"
          style={[styles.sectionTitle, { marginBottom: spacing.sm, marginLeft: spacing.xs }]}
        >
          {title}
        </AppText>
      ) : null}
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            overflow: 'hidden',
          },
          shadow,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** A single selectable chip used for theme / language pickers. */
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.primary : colors.inset,
        borderRadius: radius.full,
        minHeight: 44,
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="caption" color={selected ? colors.onPrimary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * A grouped-card row that pairs a leading icon + label with a wrapping row of
 * selectable chips below it. Used for the theme and language selectors.
 */
function ChipSelectRow<T extends string>({
  icon,
  label,
  options,
  value,
  onSelect,
  isLast,
}: {
  icon: IconName;
  label: string;
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onSelect: (key: T) => void;
  isLast?: boolean;
}) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View
      style={[
        {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.chipRowHeader}>
        <View
          style={[
            styles.iconChip,
            {
              borderRadius: radius.full,
              backgroundColor: colors.inset,
              marginRight: spacing.md,
            },
          ]}
        >
          <MaterialIcons name={icon} size={20} color={colors.text} />
        </View>
        <AppText variant="bodyMedium" numberOfLines={2} style={styles.flexShrink}>
          {label}
        </AppText>
      </View>

      <View style={[styles.chips, { marginTop: spacing.md }]}>
        {options.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            selected={value === option.key}
            onPress={() => {
              feedback.tap();
              onSelect(option.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { colors } = theme;

  const settings = useStore((s) => s.settings);
  const premium = useStore((s) => s.premium);
  const setSetting = useStore((s) => s.setSetting);
  const setLanguage = useStore((s) => s.setLanguage);
  const resetStats = useStore((s) => s.resetStats);

  const [restoring, setRestoring] = useState(false);
  const restoringRef = useRef(false);

  const handleRestore = async (): Promise<void> => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(true);
    try {
      const active = await restorePurchases();
      if (active) {
        feedback.success();
        Alert.alert(t('paywall.restoredTitle'), t('paywall.restoredMsg'));
      } else {
        Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneMsg'));
      }
    } finally {
      restoringRef.current = false;
      setRestoring(false);
    }
  };

  const openUrl = (url: string): void => {
    Linking.openURL(url).catch(() => {
      Alert.alert(t('settings.linkErrorTitle'), url);
    });
  };

  const themeModes: ReadonlyArray<{ key: ThemeMode; label: string }> = [
    { key: 'system', label: t('themeMode.system') },
    { key: 'light', label: t('themeMode.light') },
    { key: 'dark', label: t('themeMode.dark') },
  ];

  const languages: ReadonlyArray<{ key: Language; label: string }> = [
    { key: 'system', label: t('language.system') },
    { key: 'de', label: t('language.de') },
    { key: 'en', label: t('language.en') },
    { key: 'es', label: t('language.es') },
  ];

  const switchTrack = { false: colors.border, true: colors.primary };
  const thumbColor = (on: boolean): string => (on ? colors.onPrimary : colors.card);

  const renderSwitch = (
    value: boolean,
    onChange: (next: boolean) => void,
  ): ReactNode => (
    <Switch
      value={value}
      onValueChange={(next) => {
        onChange(next);
        feedback.select();
      }}
      trackColor={switchTrack}
      thumbColor={thumbColor(value)}
      ios_backgroundColor={colors.border}
    />
  );

  const confirmReset = (): void => {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.reset'),
          style: 'destructive',
          onPress: () => {
            resetStats();
            feedback.warning();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader title={t('settings.title')} />

      {/* Premium */}
      <Section>
        <SettingRow
          icon="workspace-premium"
          label={t('settings.premium')}
          description={premium ? t('settings.premiumActive') : t('settings.premiumSubtitle')}
          onPress={
            premium
              ? undefined
              : () => router.push({ pathname: '/paywall', params: { source: 'settings' } })
          }
          right={
            premium ? (
              <MaterialIcons name="check-circle" size={24} color={colors.text} />
            ) : undefined
          }
          isFirst
        />
        <SettingRow
          icon="restore"
          label={t('settings.restore')}
          onPress={() => void handleRestore()}
          right={
            restoring ? <ActivityIndicator size="small" color={colors.textMuted} /> : undefined
          }
          isLast
        />
      </Section>

      {/* General */}
      <Section title={t('settings.sectionGeneral')}>
        {/* Sound toggle hidden until audio ships (store field kept). */}
        <SettingRow
          icon="vibration"
          label={t('settings.haptics')}
          right={renderSwitch(settings.haptics, (v) => setSetting('haptics', v))}
          isFirst
          isLast
        />
      </Section>

      {/* Appearance */}
      <Section title={t('settings.sectionAppearance')}>
        <ChipSelectRow<ThemeMode>
          icon="dark-mode"
          label={t('settings.darkMode')}
          options={themeModes}
          value={settings.themeMode}
          onSelect={(mode) => setSetting('themeMode', mode)}
        />
        {/* Color-blind toggle hidden until the mode is implemented (store field kept). */}
        <SettingRow
          icon="tune"
          label={t('settings.difficultyDetails')}
          right={renderSwitch(settings.showDifficultyDetails, (v) =>
            setSetting('showDifficultyDetails', v),
          )}
          isLast
        />
      </Section>

      {/* Language */}
      <Section title={t('settings.language')}>
        <ChipSelectRow<Language>
          icon="translate"
          label={t('settings.language')}
          options={languages}
          value={settings.language}
          onSelect={(code) => setLanguage(code)}
          isLast
        />
      </Section>

      {/* Data */}
      <Section title={t('settings.sectionData')}>
        <SettingRow
          icon="replay"
          label={t('settings.resetStats')}
          onPress={confirmReset}
          isFirst
          isLast
        />
      </Section>

      {/* Legal */}
      <Section title={t('settings.sectionLegal')}>
        <SettingRow
          icon="privacy-tip"
          label={t('settings.privacy')}
          onPress={() => openUrl(PRIVACY_URL)}
          right={<MaterialIcons name="open-in-new" size={20} color={colors.textFaint} />}
          isFirst
        />
        <SettingRow
          icon="description"
          label={t('settings.terms')}
          onPress={() => openUrl(TERMS_URL)}
          right={<MaterialIcons name="open-in-new" size={20} color={colors.textFaint} />}
          isLast
        />
      </Section>

      <AppText
        variant="caption"
        color={colors.textFaint}
        align="center"
        style={{ marginBottom: theme.spacing.lg }}
      >
        {`HueMind · ${t('settings.version')} ${version}`}
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    textTransform: 'uppercase',
  },
  iconChip: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexShrink: {
    flexShrink: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
