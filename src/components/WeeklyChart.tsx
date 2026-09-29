import { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { AppText } from '@/src/components/AppText';

interface WeeklyChartProps {
  /**
   * Seven daily scores, Mon..Sun, each 0..100. `null` marks a day that should
   * not be plotted (e.g. a future day this week).
   */
  values: (number | null)[];
  /** Seven already-translated day labels, aligned with `values`. */
  labels: string[];
  /**
   * Index (0..6) of today within `values`. Days after it lie in the future and
   * are not plotted; the end dot sits on today. Defaults to the last non-null
   * value.
   */
  todayIndex?: number;
  height?: number;
  /** Curve color; defaults to the theme text color. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const PAD_V = 14;
const GRID_LINES = 3;

interface Point {
  x: number;
  y: number;
}

/**
 * Builds a smooth cubic-bezier path through the given points using a
 * Catmull-Rom spline (tension 0.5). Endpoints are duplicated so the curve
 * starts/ends exactly on the first/last point.
 */
function catmullRomPath(points: Point[], minY: number, maxY: number): string {
  const clampY = (y: number) => Math.max(minY, Math.min(maxY, y));
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clampY(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Weekly score sparkline. Measures its own width via `onLayout` and renders
 * nothing until measured (avoids a 0-width flash). Draws dotted gridlines, a
 * smooth Catmull-Rom curve through the seven daily points, a dot on the most
 * recent point and a row of day labels beneath. Theme-aware (light/dark).
 */
export function WeeklyChart({
  values,
  labels,
  todayIndex,
  height = 160,
  color,
  style,
}: WeeklyChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - width) > 0.5) {
      setWidth(next);
    }
  };

  const lineColor = color ?? theme.colors.text;
  const innerTop = PAD_V;
  const innerBottom = height - PAD_V;
  const innerHeight = innerBottom - innerTop;

  // Each value owns an equal-width column; points sit at the column centre so
  // the day labels (flex: 1, centred) line up exactly underneath them.
  let lastNonNull = -1;
  values.forEach((v, i) => {
    if (v !== null) lastNonNull = i;
  });
  const lastIndex = Math.min(values.length - 1, todayIndex ?? lastNonNull);
  const points: Point[] = [];
  values.forEach((value, index) => {
    if (value === null || index > lastIndex) return;
    const v = Math.max(0, Math.min(100, value));
    const x = (width * (index + 0.5)) / values.length;
    const y = innerTop + innerHeight * (1 - v / 100);
    points.push({ x, y });
  });

  const path = catmullRomPath(points, innerTop, innerBottom);
  const lastPoint = points[points.length - 1];

  const gridYs = Array.from({ length: GRID_LINES }, (_, i) =>
    GRID_LINES > 1 ? innerTop + (innerHeight * i) / (GRID_LINES - 1) : innerTop,
  );

  return (
    <View style={style} onLayout={onLayout}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            {gridYs.map((y, i) => (
              <Line
                key={`grid-${i}`}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth={1}
                strokeDasharray="2 5"
                strokeLinecap="round"
              />
            ))}

            {path !== '' ? (
              <Path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {points.slice(0, -1).map((p, i) => (
              <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3} fill={lineColor} />
            ))}

            {lastPoint ? (
              <Circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4.5}
                fill={lineColor}
                stroke={theme.colors.card}
                strokeWidth={2}
              />
            ) : null}
          </Svg>

          <View style={[styles.labelRow, { width }]}>
            {labels.map((label, index) => (
              <AppText
                key={`label-${index}`}
                variant="caption"
                numberOfLines={1}
                color={index === lastIndex ? theme.colors.text : theme.colors.textFaint}
                style={styles.label}
              >
                {label}
              </AppText>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
});
