import { hexToHsv } from '@/src/utils/color';

export type ColorNameKey =
  | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'teal'
  | 'cyan' | 'blue' | 'indigo' | 'purple' | 'magenta' | 'pink'
  | 'brown' | 'grey' | 'white' | 'black';

/**
 * Coarse perceptual bucket for a color, returned as an i18n key under
 * `colors.*`. Used for "Beste Farbe" / "Schwierigster Farbton".
 */
export function colorNameKey(hex: string): ColorNameKey {
  const { h, s, v } = hexToHsv(hex);
  if (v < 0.12) return 'black';
  if (s < 0.12) return v > 0.85 ? 'white' : 'grey';
  // brownish: low-value oranges
  if (h < 40 && v < 0.55 && s > 0.3) return 'brown';
  if (h < 15) return 'red';
  if (h < 40) return 'orange';
  if (h < 65) return 'yellow';
  if (h < 90) return 'lime';
  if (h < 150) return 'green';
  if (h < 175) return 'teal';
  if (h < 195) return 'cyan';
  if (h < 240) return 'blue';
  if (h < 265) return 'indigo';
  if (h < 290) return 'purple';
  if (h < 320) return 'magenta';
  if (h < 345) return 'pink';
  return 'red';
}
