import type { HSV, RGB } from '@/src/types';

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------------------
// HSV <-> RGB
// ---------------------------------------------------------------------------

/** h in [0,360), s/v in [0,1] -> RGB 0-255. */
export function hsvToRgb({ h, s, v }: HSV): RGB {
  const hh = ((h % 360) + 360) % 360 / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
  else if (hh < 2) { r = x; g = c; b = 0; }
  else if (hh < 3) { r = 0; g = c; b = x; }
  else if (hh < 4) { r = 0; g = x; b = c; }
  else if (hh < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** RGB 0-255 -> h in [0,360), s/v in [0,1]. */
export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

// ---------------------------------------------------------------------------
// HEX
// ---------------------------------------------------------------------------

function toHex2(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  if (Number.isNaN(num) || h.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function hsvToHex(hsv: HSV): string {
  return rgbToHex(hsvToRgb(hsv));
}

export function hexToHsv(hex: string): HSV {
  return rgbToHsv(hexToRgb(hex));
}

// ---------------------------------------------------------------------------
// Random target generation
// ---------------------------------------------------------------------------

/**
 * Random, clearly-perceivable target color. Full hue range; saturation and
 * value are kept away from the degenerate near-white / near-black extremes so
 * every round is a fair, distinguishable tone.
 */
export function randomTargetHex(rand: () => number = Math.random): string {
  const h = rand() * 360;
  const s = 0.45 + rand() * 0.55; // 0.45 - 1.0
  const v = 0.4 + rand() * 0.6; // 0.40 - 1.0
  return hsvToHex({ h, s, v });
}

/** Random vivid distractor color for hardcore mode (wider, punchier range). */
export function randomDistractorHex(rand: () => number = Math.random): string {
  const h = rand() * 360;
  const s = 0.35 + rand() * 0.65;
  const v = 0.35 + rand() * 0.65;
  return hsvToHex({ h, s, v });
}

// ---------------------------------------------------------------------------
// Perceptual distance: sRGB -> CIE L*a*b* (D65) -> CIEDE2000
// ---------------------------------------------------------------------------

interface Lab { L: number; a: number; b: number; }

function srgbChannelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function rgbToLab({ r, g, b }: RGB): Lab {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);
  // linear sRGB -> XYZ (D65)
  let x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  let z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;
  // normalize to D65 white
  x /= 0.95047; y /= 1.0; z /= 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIEDE2000 color difference between two Lab colors. */
function ciede2000(l1: Lab, l2: Lab): number {
  const { L: L1, a: a1, b: b1 } = l1;
  const { L: L2, a: a2, b: b2 } = l2;
  const deg = Math.PI / 180;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = Math.atan2(b1, a1p) === 0 ? 0 : (Math.atan2(b1, a1p) + 2 * Math.PI) % (2 * Math.PI);
  const h2p = Math.atan2(b2, a2p) === 0 ? 0 : (Math.atan2(b2, a2p) + 2 * Math.PI) % (2 * Math.PI);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= Math.PI) dhp = diff;
    else if (diff > Math.PI) dhp = diff - 2 * Math.PI;
    else dhp = diff + 2 * Math.PI;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > Math.PI) {
      if (h1p + h2p < 2 * Math.PI) hbarp = (h1p + h2p + 2 * Math.PI) / 2;
      else hbarp = (h1p + h2p - 2 * Math.PI) / 2;
    } else {
      hbarp = (h1p + h2p) / 2;
    }
  }
  const T =
    1 -
    0.17 * Math.cos(hbarp - 30 * deg) +
    0.24 * Math.cos(2 * hbarp) +
    0.32 * Math.cos(3 * hbarp + 6 * deg) -
    0.2 * Math.cos(4 * hbarp - 63 * deg);
  const dTheta = 30 * deg * Math.exp(-Math.pow((hbarp / deg - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/** Perceptual distance between two hex colors (CIEDE2000). 0 = identical. */
export function colorDeltaE(hexA: string, hexB: string): number {
  return ciede2000(rgbToLab(hexToRgb(hexA)), rgbToLab(hexToRgb(hexB)));
}

/** Relative luminance 0-1, for choosing readable foreground text. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** Charcoal or white text color that reads on top of the given background. */
export function readableTextColor(hex: string): string {
  return luminance(hex) > 0.45 ? '#171717' : '#FFFFFF';
}
