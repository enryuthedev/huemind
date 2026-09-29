import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/src/theme';

/** Max width of the readable content column (keeps tablets / landscape tidy). */
export const CONTENT_MAX_WIDTH = 560;

export interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  center?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
}

/**
 * Safe-area aware screen wrapper. Content is constrained to a centered
 * `CONTENT_MAX_WIDTH` column; scrollable screens get trailing bottom padding
 * so the last element never sits flush against a tab bar or footer.
 */
export function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  center = false,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
}: ScreenContainerProps) {
  const theme = useTheme();

  const containerPadding = theme.spacing.containerPadding;
  const horizontal = padded ? containerPadding : 0;

  const innerStyle: StyleProp<ViewStyle> = [
    styles.column,
    { maxWidth: CONTENT_MAX_WIDTH + horizontal * 2 },
    padded ? { paddingHorizontal: containerPadding } : null,
    scroll ? { paddingBottom: theme.spacing.xl } : null,
    center ? styles.centered : null,
    contentStyle,
  ];

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor: theme.colors.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, innerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, innerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  column: {
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
