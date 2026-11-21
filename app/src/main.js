// Neon Shores editor: wires the controls to the cover renderer. Photos are read from the person's own
// machine with object URLs and drawn locally; nothing is uploaded and nothing leaves the page.
import { POST_SIZES, LAYOUTS, drawCoverArt, drawPanelSelection, panelPolygons, pointInPolygon } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const tray = document.getElementById('tray');
const zoomInput = document.getElementById('zoom');

const state = {
  size: POST_SIZES[0],
  layout: 'poster',
  grade: 'sunset',
  caption: 'Neon Harbor',
  subcaption: 'Vice Shores',
  photos: [],
  photoUrls: [],
  panels: [0, 1, 2, 3].map(() => ({ photo: null, ox: 0, oy: 0, zoom: 1 })),
  selected: 0,
  pickedPhoto: null,
  grain: true,
  vignette: true,
};

let fontsReady = Promise.resolve();
try {
  const anton = new FontFace('Anton', "url('./fonts/Anton-Regular.ttf')");
  fontsReady = anton.load().then((face) => document.fonts.add(face)).catch(() => {});
} catch { /* the CSS @font-face still covers the caption */ }

export function redraw() {
  canvas.width = state.size.width;
  canvas.height = state.size.height;
  drawCoverArt(canvas, state);
  const polygon = panelPolygons(state.layout)[state.selected];
  if (polygon && !document.body.classList.contains('shot-cover')) drawPanelSelection(canvas, polygon);
  zoomInput.value = String(state.panels[state.selected]?.zoom ?? 1);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo (by URL) to the tray and places it in the first free panel, or the selected one. */
export async function addPhoto(url) {
  const img = await loadImage(url);
  const index = state.photos.length;
  state.photos.push(img);
  state.photoUrls.push(url);
  const thumb = document.createElement('button');
  thumb.type = 'button';
  thumb.setAttribute('aria-pressed', 'false');
  const view = document.createElement('img');
  view.src = url;
  view.alt = `Photo ${index + 1}`;
  thumb.appendChild(view);
  thumb.addEventListener('click', () => {
    state.pickedPhoto = index;
    tray.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    thumb.setAttribute('aria-pressed', 'true');
    status.textContent = `Photo ${index + 1} picked — click a panel to place it.`;
  });
  tray.appendChild(thumb);
  const free = state.panels.findIndex((slot, i) => slot.photo == null && i < panelPolygons(state.layout).length);
  const target = free >= 0 ? free : state.selected;
  state.panels[target].photo = index;
  state.selected = target;
  redraw();
  return index;
}

document.getElementById('photo-input').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) await addPhoto(URL.createObjectURL(file));
  if (files.length) status.textContent = `${files.length} photo(s) loaded — drag inside a panel to reposition it.`;
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    await addPhoto(`samples/${button.dataset.sample}.jpg`);
    status.textContent = 'Sample placed. Add your own photo any time.';
  });
});

function buildSegmented(containerId, options, current, onPick) {
  const box = document.getElementById(containerId);
  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    button.setAttribute('aria-pressed', String(option.id === current));
    button.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      onPick(option);
    });
    box.appendChild(button);
  });
}

buildSegmented('layouts', LAYOUTS, state.layout, (option) => {
  state.layout = option.id;
  if (state.selected >= option.panels) state.selected = 0;
  redraw();
});
buildSegmented('sizes', POST_SIZES, state.size.id, (option) => {
  state.size = option;
  redraw();
});

document.getElementById('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
document.getElementById('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
document.getElementById('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value; redraw(); });
zoomInput.addEventListener('input', () => {
  const slot = state.panels[state.selected];
  if (slot) slot.zoom = Number(zoomInput.value);
  redraw();
});

// Pointer work on the preview: click selects (and places a picked photo), drag moves, wheel zooms.
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
}

function panelAt(point) {
  const polygons = panelPolygons(state.layout);
  for (let i = polygons.length - 1; i >= 0; i--) {
    if (pointInPolygon(point.x, point.y, polygons[i])) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const index = panelAt(point);
  if (index < 0) return;
  state.selected = index;
  if (state.pickedPhoto != null) {
    state.panels[index].photo = state.pickedPhoto;
    state.pickedPhoto = null;
    tray.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    status.textContent = `Placed in panel ${index + 1}.`;
  }
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const slot = state.panels[state.selected];
  if (!slot || slot.photo == null) return;
  const rect = canvas.getBoundingClientRect();
  slot.ox = Math.max(-1, Math.min(1, slot.ox + ((e.clientX - drag.x) / rect.width) * 2.4));
  slot.oy = Math.max(-1, Math.min(1, slot.oy + ((e.clientY - drag.y) / rect.height) * 2.4));
  drag = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const slot = state.panels[state.selected];
  if (!slot || slot.photo == null) return;
  e.preventDefault();
  slot.zoom = Math.max(1, Math.min(3.5, slot.zoom * (e.deltaY < 0 ? 1.06 : 0.94)));
  redraw();
}, { passive: false });

document.getElementById('export').addEventListener('click', () => {
  drawCoverArt(canvas, state); // the export carries no selection marker
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-shores-cover-${state.size.width}x${state.size.height}.png`;
    a.click();
    status.textContent = `Saved ${a.download}`;
    redraw();
  }, 'image/png');
});

/** Sets up a fixed scene for a screenshot: the named samples into the panels, caption, layout, grade, size. */
export async function setupScene(scene) {
  if (scene.size) state.size = POST_SIZES.find((s) => s.id === scene.size) ?? state.size;
  if (scene.layout) state.layout = scene.layout;
  if (scene.grade) state.grade = scene.grade;
  if (scene.caption != null) {
    state.caption = scene.caption;
    document.getElementById('caption').value = scene.caption;
  }
  if (scene.sub != null) {
    state.subcaption = scene.sub;
    document.getElementById('subcaption').value = scene.sub;
  }
  document.getElementById('grade').value = state.grade;
  for (const name of scene.photos) {
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push(img);
    state.photoUrls.push(`samples/${name}.jpg`);
  }
  const count = panelPolygons(state.layout).length;
  for (let i = 0; i < count; i++) {
    state.panels[i].photo = state.photos.length ? i % state.photos.length : null;
    state.panels[i].zoom = 1.12;
  }
  await fontsReady;
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), setupScene);
} else {
  fontsReady.then(() => redraw());
}
