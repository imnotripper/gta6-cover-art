// Neon Shores cover renderer: draws the multi-panel poster, the colour grade and the caption lettering
// onto any 2D canvas at the canvas's own size. Pure canvas, no network, no library.

export const POST_SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide · 1920 × 1080', width: 1920, height: 1080 },
];

export const LAYOUTS = [
  { id: 'poster', label: 'Poster', panels: 4 },
  { id: 'grid', label: 'Grid', panels: 4 },
  { id: 'stripes', label: 'Stripes', panels: 4 },
  { id: 'duo', label: 'Duo', panels: 2 },
];

// Each grade: a photo filter, a top-to-bottom wash, a warm band, per-panel tints and the accent colour
// the caption shadow and the sub-caption pill are painted with.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.32) contrast(1.07) brightness(1.03)',
    washTop: 'rgba(24, 176, 196, 0.20)',
    washMid: 'rgba(255, 138, 61, 0.16)',
    washBottom: 'rgba(232, 42, 122, 0.38)',
    tints: ['rgba(255, 122, 61, 0.16)', 'rgba(232, 42, 122, 0.14)', 'rgba(24, 176, 196, 0.15)', 'rgba(255, 196, 61, 0.13)'],
    accent: '#ff2e88',
    pill: '#ffd23f',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.5) contrast(1.14) brightness(0.98)',
    washTop: 'rgba(64, 0, 150, 0.28)',
    washMid: 'rgba(255, 0, 128, 0.10)',
    washBottom: 'rgba(0, 229, 255, 0.26)',
    tints: ['rgba(0, 229, 255, 0.15)', 'rgba(255, 0, 128, 0.16)', 'rgba(120, 60, 255, 0.16)', 'rgba(0, 255, 170, 0.12)'],
    accent: '#00e5ff',
    pill: '#ff2e88',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.25) contrast(1.05) brightness(1.05)',
    washTop: 'rgba(255, 214, 120, 0.16)',
    washMid: 'rgba(255, 150, 50, 0.14)',
    washBottom: 'rgba(146, 44, 8, 0.34)',
    tints: ['rgba(255, 170, 60, 0.15)', 'rgba(255, 120, 40, 0.13)', 'rgba(255, 210, 110, 0.12)', 'rgba(200, 90, 30, 0.14)'],
    accent: '#ffb03a',
    pill: '#2ec4b6',
  },
  mono: {
    label: 'Noir Mono',
    filter: 'grayscale(0.92) contrast(1.18) brightness(1.02)',
    washTop: 'rgba(200, 210, 225, 0.10)',
    washMid: 'rgba(120, 130, 150, 0.06)',
    washBottom: 'rgba(5, 5, 12, 0.42)',
    tints: ['rgba(255, 255, 255, 0.05)', 'rgba(0, 0, 0, 0.10)', 'rgba(255, 255, 255, 0.04)', 'rgba(0, 0, 0, 0.08)'],
    accent: '#e8e8f0',
    pill: '#e8e8f0',
  },
};

const PLACEHOLDER_HUES = [268, 318, 187, 24];

/** The panel polygons of a layout, in unit space (0..1 on both axes), angled dividers included. */
export function panelPolygons(layoutId) {
  switch (layoutId) {
    case 'grid':
      return [
        [[0, 0], [0.54, 0], [0.515, 0.5], [0, 0.46]],
        [[0.54, 0], [1, 0], [1, 0.54], [0.515, 0.5]],
        [[0, 0.46], [0.515, 0.5], [0.48, 1], [0, 1]],
        [[0.515, 0.5], [1, 0.54], [1, 1], [0.48, 1]],
      ];
    case 'stripes':
      return [
        [[0, 0], [0.28, 0], [0.22, 1], [0, 1]],
        [[0.28, 0], [0.52, 0], [0.46, 1], [0.22, 1]],
        [[0.52, 0], [0.76, 0], [0.7, 1], [0.46, 1]],
        [[0.76, 0], [1, 0], [1, 1], [0.7, 1]],
      ];
    case 'duo':
      return [
        [[0, 0], [1, 0], [0.3, 1], [0, 1]],
        [[1, 0], [1, 1], [0.3, 1]],
      ];
    case 'poster':
    default:
      return [
        [[0, 0], [1, 0], [1, 0.58], [0, 0.64]],
        [[0, 0.64], [0.36, 0.618], [0.33, 1], [0, 1]],
        [[0.36, 0.618], [0.68, 0.599], [0.66, 1], [0.33, 1]],
        [[0.68, 0.599], [1, 0.58], [1, 1], [0.66, 1]],
      ];
  }
}

/** True when the unit-space point (x, y) falls inside the polygon. */
export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonPath(ctx, polygon, w, h) {
  ctx.beginPath();
  polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
  ctx.closePath();
}

function polygonBounds(polygon) {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** Draws one panel: its photo cover-fitted into the polygon's bounds, clipped to the polygon. */
function drawPanelPhoto(ctx, w, h, polygon, slot, photo, grade, panelIndex) {
  const b = polygonBounds(polygon);
  const bx = b.x * w;
  const by = b.y * h;
  const bw = b.w * w;
  const bh = b.h * h;
  ctx.save();
  polygonPath(ctx, polygon, w, h);
  ctx.clip();
  if (photo) {
    const zoom = slot?.zoom ?? 1;
    const scale = Math.max(bw / photo.naturalWidth, bh / photo.naturalHeight) * zoom;
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const ox = slot?.ox ?? 0;
    const oy = slot?.oy ?? 0;
    const dx = bx + (bw - dw) * (0.5 + ox / 2);
    const dy = by + (bh - dh) * (0.5 + oy / 2);
    try { ctx.filter = grade.filter; } catch { /* older engines draw unfiltered */ }
    ctx.drawImage(photo, dx, dy, dw, dh);
    try { ctx.filter = 'none'; } catch { /* ignore */ }
  } else {
    const hue = PLACEHOLDER_HUES[panelIndex % PLACEHOLDER_HUES.length];
    const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    grad.addColorStop(0, `hsl(${hue} 65% 30%)`);
    grad.addColorStop(1, `hsl(${(hue + 50) % 360} 70% 16%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = -bh; x < bw; x += Math.max(18, w * 0.03)) {
      ctx.beginPath();
      ctx.moveTo(bx + x, by + bh);
      ctx.lineTo(bx + x + bh * 0.5, by);
      ctx.lineTo(bx + x + bh * 0.5 + w * 0.012, by);
      ctx.lineTo(bx + x + w * 0.012, by + bh);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = grade.tints[panelIndex % grade.tints.length];
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
}

let grainPattern = null;

/** A small tile of deterministic noise, drawn once and reused as a pattern for the grain pass. */
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 180;
  tile.height = 180;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(180, 180);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 96 + (seed % 128);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

/** Splits the caption into one or two lines that each fit `maxWidth` at the current font. */
function wrapCaption(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const width = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || width < best.width) best = { lines: [a, b], width };
  }
  return best ? best.lines : [text];
}

/** Paints the sub-caption pill and the big condensed caption, bottom-left, with an accent drop shadow. */
function drawCaption(ctx, w, h, state, grade) {
  const caption = (state.caption ?? '').trim().toUpperCase();
  const sub = (state.subcaption ?? '').trim().toUpperCase();
  if (!caption && !sub) return;
  const u = Math.min(w, h);
  const pad = w * 0.055;
  let cursorBottom = h - h * 0.045;

  if (caption) {
    let size = u * 0.148;
    const maxTextWidth = w * 0.86;
    const setFont = () => { ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`; };
    setFont();
    let lines = wrapCaption(ctx, caption, maxTextWidth);
    while (lines.some((line) => ctx.measureText(line).width > maxTextWidth) && size > 14) {
      size *= 0.94;
      setFont();
      lines = wrapCaption(ctx, caption, maxTextWidth);
    }
    try { ctx.letterSpacing = `${Math.round(size * 0.012)}px`; } catch { /* plain spacing */ }
    const lineHeight = size * 0.96;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let i = lines.length - 1; i >= 0; i--) {
      const baseline = cursorBottom - (lines.length - 1 - i) * lineHeight;
      ctx.save();
      ctx.transform(1, 0, -0.055, 1, 0, 0);
      const tx = pad + 0.055 * baseline; // the shear shifts a glyph left by 0.055 * y; cancel it exactly
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(10, 6, 18, 0.92)';
      ctx.lineWidth = size * 0.17;
      ctx.fillStyle = grade.accent;
      ctx.fillText(lines[i], tx + size * 0.05, baseline + size * 0.05);
      ctx.strokeText(lines[i], tx, baseline);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lines[i], tx, baseline);
      ctx.restore();
    }
    cursorBottom -= lines.length * lineHeight + u * 0.018;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  if (sub) {
    const size = u * 0.032;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    const tw = ctx.measureText(sub).width;
    const pillW = tw + size * 1.5;
    const pillH = size * 1.72;
    const pillX = pad;
    const pillY = cursorBottom - pillH;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = grade.pill;
    ctx.fill();
    ctx.fillStyle = '#17101f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub, pillX + pillW / 2, pillY + pillH / 2 + size * 0.06);
    ctx.restore();
  }
}

/**
 * Draws the whole cover described by `state` onto `canvas` at the canvas's own size.
 * state: { layout, grade, caption, subcaption, photos: [image...], panels: [{photo, ox, oy, zoom}...],
 *          grain, vignette }
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const polygons = panelPolygons(state.layout);

  ctx.fillStyle = '#120a1e';
  ctx.fillRect(0, 0, w, h);

  polygons.forEach((polygon, i) => {
    const slot = state.panels[i] ?? {};
    const photo = slot.photo != null ? state.photos[slot.photo] : null;
    drawPanelPhoto(ctx, w, h, polygon, slot, photo, grade, i);
  });

  // The grade wash: cool top, warm band, hot foot.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(0.52, grade.washMid);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // A soft sun glow low on the frame.
  const glow = ctx.createRadialGradient(w * 0.78, h * 0.6, 0, w * 0.78, h * 0.6, w * 0.55);
  glow.addColorStop(0, 'rgba(255, 170, 60, 0.20)');
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Panel borders: dark keyline under a white rule, then the outer frame.
  const rule = Math.max(3, w * 0.0055);
  polygons.forEach((polygon) => {
    polygonPath(ctx, polygon, w, h);
    ctx.strokeStyle = 'rgba(8, 4, 14, 0.9)';
    ctx.lineWidth = rule * 2.1;
    ctx.stroke();
    polygonPath(ctx, polygon, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = rule;
    ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(8, 4, 14, 0.9)';
  ctx.lineWidth = rule * 2.4;
  ctx.strokeRect(0, 0, w, h);

  // Accent bar across the very top.
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, '#19b8c4');
  bar.addColorStop(0.5, grade.accent);
  bar.addColorStop(1, '#ffd23f');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, w, Math.max(4, h * 0.011));

  drawCaption(ctx, w, h, state, grade);

  if (state.vignette) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
    vig.addColorStop(1, 'rgba(8, 0, 18, 0.44)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = getGrainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** Outlines one panel on an overlay pass (the editor's selection marker); not part of the exported art. */
export function drawPanelSelection(canvas, polygon) {
  const ctx = canvas.getContext('2d');
  polygonPath(ctx, polygon, canvas.width, canvas.height);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = Math.max(3, canvas.width * 0.006);
  ctx.setLineDash([canvas.width * 0.02, canvas.width * 0.012]);
  ctx.stroke();
  ctx.setLineDash([]);
}
