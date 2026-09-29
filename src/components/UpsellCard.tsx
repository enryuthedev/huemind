import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';
import { AppButton } from '@/src/components/AppButton';

interface UpsellCardProps {
  onPress: () => void;
  onDismiss: () => void;
}

/** Soft, dismissible Pro teaser shown on the result screen after a good round. */
export function UpsellCard({ onPress, onDismiss }: UpsellCardProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardAlt,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <MaterialIcons name="auto-awesome" size={20} color={theme.colors.text} />
        <View style={styles.texts}>
          <AppText variant="bodyMedium">{t('upsell.title')}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {t('upsell.body')}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('upsell.dismiss')}
          onPress={onDismiss}
          hitSlop={10}
          style={styles.close}
        >
          <MaterialIcons name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <AppButton
        label={t('upsell.cta')}
        variant="secondary"
        icon="arrow-forward"
        iconPosition="right"
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    marginRight: -6,
  },
});
