import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';
import { AppButton } from '@/src/components/AppButton';

interface ProLockProps {
  /** Placeholder content rendered dimmed underneath the lock. */
  children: ReactNode;
  /** Headline, e.g. "Mit Pro freischalten". */
  title: string;
  /** Optional one-line explanation. */
  description?: string;
  /** Button label. */
  ctaLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Locked "HueMind Pro" teaser: renders `children` (fake / placeholder content)
 * dimmed and non-interactive, with a centered lock + CTA overlay on top.
 */
export function ProLock({
  children,
  title,
  description,
  ctaLabel,
  onPress,
  style,
}: ProLockProps) {
  const theme = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.root, style]}>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.dimmed}
      >
        {children}
      </View>

      {/* Frosted scrim */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.card, opacity: 0.55, borderRadius: radius.lg },
        ]}
      />

      <View style={[StyleSheet.absoluteFill, styles.overlay, { padding: spacing.lg }]}>
        <View
          style={[
            styles.lockChip,
            { backgroundColor: colors.primary, borderRadius: radius.full },
          ]}
        >
          <MaterialIcons name="lock" size={22} color={colors.onPrimary} />
        </View>
        <AppText
          variant="title"
          align="center"
          numberOfLines={2}
          style={{ marginTop: spacing.md }}
        >
          {title}
        </AppText>
        {description ? (
          <AppText
            variant="caption"
            align="center"
            color={colors.textMuted}
            numberOfLines={3}
            style={{ marginTop: spacing.xs, maxWidth: 320 }}
          >
            {description}
          </AppText>
        ) : null}
        <AppButton
          label={ctaLabel}
          icon="workspace-premium"
          full={false}
          onPress={onPress}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    minHeight: 260,
  },
  dimmed: {
    opacity: 0.35,
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockChip: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
