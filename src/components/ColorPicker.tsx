import { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme';
import type { HSV } from '@/src/types';
import { clamp, hsvToHex } from '@/src/utils/color';
import { feedback } from '@/src/services/feedback';
import { AppText } from '@/src/components/AppText';

interface ColorPickerProps {
  value: HSV;
  onChange: (hsv: HSV) => void;
  /** Called when any drag (panel or slider) begins. */
  onDragStart?: () => void;
  /** Called when a drag ends or is cancelled by the system. */
  onDragEnd?: () => void;
}

const PANEL_THUMB = 30;
const SLIDER_THUMB = 32;
/** Visual track thickness. */
const TRACK_HEIGHT = 22;
/** Touchable slider height (≥ 44dp guideline). */
const SLIDER_TOUCH = 44;
const SLIDER_HIT_SLOP = { top: 8, bottom: 8, left: 12, right: 12 };
/** A light haptic tick fires each time the hue crosses one of these steps. */
const HUE_TICK_DEG = 15;
const HUE_TICK_MIN_MS = 35;

/** Touch origin (page coordinates) + size of a draggable surface. */
interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Target = 'panel' | 'hue' | 'bri';

/**
 * Intuitive HSV color picker: a saturation/brightness panel, a hue slider and
 * a brightness slider. Built on PanResponder (no native gesture deps) so it
 * runs unmodified in Expo Go. Fully controlled via `value` / `onChange`.
 *
 * Drags claim the responder exclusively (never yielded to a parent ScrollView)
 * and positions are derived from `pageX/pageY` minus the surface origin captured
 * at grant, which avoids the `locationX/Y` jumps Android reports mid-drag when
 * the touch moves over a different child view.
 */
export function ColorPicker({
  value,
  onChange,
  onDragStart,
  onDragEnd,
}: ColorPickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width: winW, height: winH } = useWindowDimensions();

  // Latest props for the once-created PanResponders.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const frames = useRef<Record<Target, Frame>>({
    panel: { x: 0, y: 0, w: 1, h: 1 },
    hue: { x: 0, y: 0, w: 1, h: 1 },
    bri: { x: 0, y: 0, w: 1, h: 1 },
  });
  const viewRefs = {
    panel: useRef<View>(null),
    hue: useRef<View>(null),
    bri: useRef<View>(null),
  };
  const hueTick = useRef({ bucket: -1, at: 0 });

  function measure(target: Target) {
    viewRefs[target].current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        frames.current[target] = { ...frames.current[target], w, h };
      }
    });
  }

  function onLayoutOf(target: Target) {
    return (ev: LayoutChangeEvent) => {
      const { width, height } = ev.nativeEvent.layout;
      frames.current[target] = { ...frames.current[target], w: width, h: height };
      measure(target);
    };
  }

  /**
   * Capture the surface origin in page coordinates at grant. `locationX/Y` is
   * reliable for the initial touch (all children share the surface origin or
   * are `pointerEvents="none"`), so page − location gives an origin in the
   * same coordinate space as every subsequent `pageX/pageY`.
   */
  function captureOrigin(target: Target, e: GestureResponderEvent) {
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    const f = frames.current[target];
    frames.current[target] = {
      ...f,
      x: pageX - locationX,
      y: pageY - locationY,
    };
    measure(target);
  }

  function relative(target: Target, e: GestureResponderEvent) {
    const f = frames.current[target];
    return {
      x: clamp(e.nativeEvent.pageX - f.x, 0, f.w),
      y: clamp(e.nativeEvent.pageY - f.y, 0, f.h),
      w: Math.max(1, f.w),
      h: Math.max(1, f.h),
    };
  }

  function handlePanel(e: GestureResponderEvent) {
    const { x, y, w, h } = relative('panel', e);
    onChangeRef.current({ ...valueRef.current, s: x / w, v: 1 - y / h });
  }

  function handleHue(e: GestureResponderEvent) {
    const { x, w } = relative('hue', e);
    const h = (x / w) * 360;
    const bucket = Math.floor(h / HUE_TICK_DEG);
    const now = Date.now();
    if (
      bucket !== hueTick.current.bucket &&
      now - hueTick.current.at >= HUE_TICK_MIN_MS
    ) {
      if (hueTick.current.bucket !== -1) {
        feedback.selection();
      }
      hueTick.current = { bucket, at: now };
    }
    onChangeRef.current({ ...valueRef.current, h });
  }

  function handleBri(e: GestureResponderEvent) {
    const { x, w } = relative('bri', e);
    onChangeRef.current({ ...valueRef.current, v: x / w });
  }

  function makePan(target: Target, handle: (e: GestureResponderEvent) => void) {
    const end = () => {
      if (target === 'hue') {
        hueTick.current = { bucket: -1, at: 0 };
      }
      onDragEndRef.current?.();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        onDragStartRef.current?.();
        captureOrigin(target, e);
        handle(e);
      },
      onPanResponderMove: (e) => handle(e),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }

  const panelPan = useMemo(() => makePan('panel', handlePanel), []);
  const huePan = useMemo(() => makePan('hue', handleHue), []);
  const briPan = useMemo(() => makePan('bri', handleBri), []);

  const hueColor = hsvToHex({ h: value.h, s: 1, v: 1 });
  const panelHeight = Math.round(
    Math.max(120, Math.min((winW - 80) / 1.08, winH * 0.32)),
  );

  return (
    <View
      style={[
        styles.card,
        theme.shadow,
        { backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: theme.spacing.lg },
      ]}
    >
      {/* Saturation / brightness panel */}
      <View
        ref={viewRefs.panel}
        {...panelPan.panHandlers}
        onLayout={onLayoutOf('panel')}
        style={[
          styles.panel,
          { height: panelHeight, backgroundColor: hueColor, borderRadius: theme.radius.md },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#FFFFFF', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.md }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', '#000000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.md }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.panelThumb,
            {
              left: `${value.s * 100}%`,
              top: `${(1 - value.v) * 100}%`,
              backgroundColor: hsvToHex(value),
            },
          ]}
        />
      </View>

      {/* Hue slider */}
      <AppText
        variant="label"
        color={theme.colors.textMuted}
        style={[styles.sliderLabel, { marginTop: theme.spacing.md }]}
      >
        {t('game.hue')}
      </AppText>
      <View
        ref={viewRefs.hue}
        {...huePan.panHandlers}
        hitSlop={SLIDER_HIT_SLOP}
        onLayout={onLayoutOf('hue')}
        style={styles.sliderTouch}
      >
        <View pointerEvents="none" style={styles.sliderTrack}>
          <LinearGradient
            colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <SliderThumb position={value.h / 360} color={hueColor} />
      </View>

      {/* Brightness slider */}
      <AppText
        variant="label"
        color={theme.colors.textMuted}
        style={[styles.sliderLabel, { marginTop: theme.spacing.sm }]}
      >
        {t('game.brightness')}
      </AppText>
      <View
        ref={viewRefs.bri}
        {...briPan.panHandlers}
        hitSlop={SLIDER_HIT_SLOP}
        onLayout={onLayoutOf('bri')}
        style={styles.sliderTouch}
      >
        <View pointerEvents="none" style={styles.sliderTrack}>
          <LinearGradient
            colors={['#000000', hsvToHex({ h: value.h, s: value.s, v: 1 })]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <SliderThumb position={value.v} color={hsvToHex(value)} />
      </View>
    </View>
  );
}

function SliderThumb({ position, color }: { position: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.sliderThumb,
        { left: `${clamp(position, 0, 1) * 100}%`, backgroundColor: color },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  panel: {
    width: '100%',
    overflow: 'hidden',
  },
  panelThumb: {
    position: 'absolute',
    width: PANEL_THUMB,
    height: PANEL_THUMB,
    borderRadius: PANEL_THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginLeft: -PANEL_THUMB / 2,
    marginTop: -PANEL_THUMB / 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  sliderLabel: {
    marginBottom: 2,
  },
  sliderTouch: {
    width: '100%',
    height: SLIDER_TOUCH,
    justifyContent: 'center',
  },
  sliderTrack: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  sliderThumb: {
    position: 'absolute',
    top: (SLIDER_TOUCH - SLIDER_THUMB) / 2,
    width: SLIDER_THUMB,
    height: SLIDER_THUMB,
    borderRadius: SLIDER_THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginLeft: -SLIDER_THUMB / 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
});
