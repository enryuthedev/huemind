import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme';

interface BrandLogoProps {
  size?: number;
}

/**
 * The HueMind brand mark: a rounded-square card holding a concentric
 * teal→coral gradient dot with a soft white center glow. Mirrors the splash
 * logo. Pure RN + expo-linear-gradient so it bundles unchanged in Expo Go.
 */
export function BrandLogo({ size = 96 }: BrandLogoProps) {
  const theme = useTheme();

  const padding = size * 0.16;
  const dotSize = size - padding * 2;
  const dotRadius = dotSize / 2;
  const glowSize = dotSize * 0.52;

  return (
    <View
      style={[
        styles.card,
        theme.shadow,
        {
          width: size,
          height: size,
          padding,
          borderRadius: size * 0.28,
          backgroundColor: theme.colors.card,
        },
      ]}
    >
      {/* Concentric teal→coral gradient dot */}
      <View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotRadius },
        ]}
      >
        <LinearGradient
          colors={['#4ECDC4', '#45B7D1', '#FF6B6B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: dotRadius }]}
        />
        {/* Soft white center glow */}
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.glowCore,
            {
              width: glowSize * 0.5,
              height: glowSize * 0.5,
              borderRadius: (glowSize * 0.5) / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  glowCore: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
});
