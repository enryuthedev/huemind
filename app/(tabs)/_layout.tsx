import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Minimal shape of the props expo-router passes to a custom `tabBar`.
 * expo-router 57 vendors react-navigation internally and no longer exports
 * `BottomTabBarProps`, so we type only the fields this component reads.
 */
type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

import { useTheme } from '@/src/theme';
import { feedback } from '@/src/services/feedback';

type IconName = keyof typeof MaterialIcons.glyphMap;

const TAB_ICONS: Record<string, IconName> = {
  home: 'home',
  progress: 'insights',
  settings: 'settings',
};

const TAB_LABEL_KEYS: Record<string, string> = {
  home: 'common.home',
  progress: 'progress.title',
  settings: 'settings.title',
};

/**
 * Floating, rounded top tab bar. The active route is rendered as a filled
 * rounded pill (colors.inset background + colors.text foreground); inactive
 * routes use colors.textMuted. Safe-area bottom padding keeps content above
 * the home indicator.
 */
function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const containerStyle = useMemo(
    () => [
      styles.bar,
      theme.shadow,
      {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        borderColor: theme.colors.border,
        paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
      },
    ],
    [theme, insets.bottom],
  );

  return (
    <View style={containerStyle}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const iconName = TAB_ICONS[route.name] ?? 'circle';
          const labelKey = TAB_LABEL_KEYS[route.name];
          const label = labelKey ? t(labelKey) : (options.title ?? route.name);
          const fg = focused ? theme.colors.text : theme.colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              feedback.tap();
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.item}
            >
              {/* Icon-only tabs (matches the design); the active tab sits in a
                  soft filled circle. */}
              <View style={styles.pill}>
                {/* Background lives in its own always-coloured layer and only its
                    opacity toggles: on Android, switching backgroundColor from
                    transparent drops the borderRadius (renders a square). */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.pillBg,
                    { backgroundColor: theme.colors.inset, opacity: focused ? 1 : 0 },
                  ]}
                />
                <MaterialIcons name={iconName} size={26} color={fg} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: t('common.home') }} />
      <Tabs.Screen name="progress" options={{ title: t('progress.title') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
});
