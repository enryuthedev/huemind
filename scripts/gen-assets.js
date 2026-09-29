// Minimal dependency-free PNG generator for HueMind launcher/splash assets.
// Draws the brand "gradient dot": warm off-white field with a soft teal ring
// fading to a coral center — matching the splash/logo concept.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

const BG = [253, 248, 248];      // #FDF8F8 warm white
const TEAL = [78, 205, 196];     // #4ECDC4
const CORAL = [255, 107, 107];   // #FF6B6B

function drawDot(size, dotScale) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = (size / 2) * dotScale; // outer radius of the dot
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let rgb = BG;
      let alpha = 255;
      if (dist <= R) {
        // radial blend: coral at center -> teal at edge
        const t = Math.min(1, dist / R);
        rgb = mix(CORAL, TEAL, Math.pow(t, 0.85));
        // soft inner glow toward white near very center
        rgb = mix([255, 235, 230], rgb, Math.min(1, t * 2.2));
      } else if (dist <= R + size * 0.012) {
        // antialiased edge
        const t = (dist - R) / (size * 0.012);
        rgb = mix(TEAL, BG, t);
      }
      const i = (y * size + x) * 4;
      buf[i] = Math.round(rgb[0]);
      buf[i + 1] = Math.round(rgb[1]);
      buf[i + 2] = Math.round(rgb[2]);
      buf[i + 3] = alpha;
    }
  }
  return buf;
}

function encodePNG(width, height, rgba) {
  // raw with per-row filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0, 0);
    return Buffer.concat([len, body, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon.png', size: 1024, dotScale: 0.62 },
  { file: 'adaptive-icon.png', size: 1024, dotScale: 0.5 },
  { file: 'splash-icon.png', size: 512, dotScale: 0.7 },
  { file: 'favicon.png', size: 64, dotScale: 0.7 },
];

for (const t of targets) {
  const rgba = drawDot(t.size, t.dotScale);
  const png = encodePNG(t.size, t.size, rgba);
  fs.writeFileSync(path.join(outDir, t.file), png);
  console.log('wrote', t.file, png.length, 'bytes');
}
