// The Live Earth viewer: finds the newest picture for the chosen satellite and view, shows
// it as big as the screen allows, checks for a newer one every minute, and plays recent
// hours back as a time-lapse. GOES pictures load straight from NOAA's image server; Meteosat
// pictures come from EUMETSAT's map service, and the whole-Earth one is redrawn as a round
// planet on a canvas here (src/lib/eumetsat.ts). Nothing leaves the browser except
// kylepace.dev's anonymous analytics.
import { SATELLITES, type Satellite, type Size, type View } from './views';
import { alignDown, candidates, imageUrl, lapseFrames, lapseSize, pickSize } from './goes';
import { DISK_EXTENT, LAYER, reprojectDisk, sourceSize, wmsUrl } from './eumetsat';
import { FILL, parseTimes, tilePlan, tileUrl, timesUrl, zoomFor, type Box } from './cira';
import { formatLon, lightingFor, subsolarPoint } from './sun';
import { track } from './track';

type Detail = 'standard' | 'high';
type Mode = 'live' | '3' | '12';

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

const root = $<HTMLElement>('[data-viewer]');
const stage = $<HTMLElement>('[data-stage]', root);
const frame = $<HTMLElement>('[data-frame]', root);
const img = $<HTMLImageElement>('[data-img]', root);
const statusEl = $<HTMLElement>('[data-status]', root);
const whatEl = $<HTMLElement>('[data-what]', root);
const whenEl = $<HTMLElement>('[data-when]', root);
const creditEl = $<HTMLElement>('[data-credit]', root);
const viewSelect = $<HTMLSelectElement>('[data-view-select]', root);
const playBtn = $<HTMLButtonElement>('[data-play]', root);
const scrub = $<HTMLInputElement>('[data-scrub]', root);
const lapseRow = $<HTMLElement>('[data-lapse-row]', root);
const fullBtn = $<HTMLButtonElement>('[data-fullscreen]', root);
const hideBtn = $<HTMLButtonElement>('[data-hide]', root);
const showBtn = $<HTMLButtonElement>('[data-show]', root);
const strip = $<SVGSVGElement>('[data-strip]', root);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- State ----------

const params = new URLSearchParams(location.search);
const storedDetail = safeGet('live-earth:detail');

let sat: Satellite = SATELLITES.find((s) => s.id === params.get('sat')) ?? sunniest();
let view: View = sat.views.find((v) => v.id === params.get('view')) ?? sat.views[0];
let detail: Detail = params.get('detail') === 'high' || storedDetail === 'high' ? 'high' : 'standard';
let mode: Mode = 'live';
let latest: Date | null = null; // newest scan found for the current view
let shown: Date | null = null; // scan time of the picture on screen
let loadToken = 0; // bumps on every change, so late-arriving pictures are dropped
let lapse: { frames: { when: Date; img: HTMLImageElement }[]; index: number; timer: number | null } | null = null;

function sunniest(): Satellite {
  const sun = subsolarPoint(new Date()).lon;
  const dist = (s: Satellite) => {
    const d = Math.abs(s.lon - sun) % 360;
    return d > 180 ? 360 - d : d;
  };
  return [...SATELLITES].sort((a, b) => dist(a) - dist(b))[0];
}

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private browsing or storage off: the choice just isn't remembered. */
  }
}

function saveUrl() {
  const p = new URLSearchParams();
  p.set('sat', sat.id);
  if (view.id !== 'earth') p.set('view', view.id);
  if (detail === 'high') p.set('detail', 'high');
  history.replaceState(null, '', `${location.pathname}?${p}`);
}

// ---------- Loading pictures ----------

function load(url: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.referrerPolicy = 'no-referrer';
    // The canvas can only read a picture from another site if it was asked for with CORS.
    if (cors) el.crossOrigin = 'anonymous';
    el.decoding = 'async';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Not available: ${url}`));
    el.src = url;
  });
}

// Pictures drawn on a canvas are handed to <img> as blob: addresses, which hold memory until
// they're released. Each one is released once nothing on screen uses it.
const blobs = new Set<string>();

function release(url: string | null | undefined) {
  if (url && blobs.has(url)) {
    URL.revokeObjectURL(url);
    blobs.delete(url);
  }
}

async function toImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Could not draw the picture.');
  const url = URL.createObjectURL(blob);
  blobs.add(url);
  return load(url);
}

/** One picture of a view at a size, from whichever service has it. */
async function loadPicture(s: Satellite, v: View, when: Date, size: Size): Promise<HTMLImageElement> {
  if (s.source === 'noaa') return load(imageUrl(s, v, when, size));
  if (s.source === 'cira') return stitchTiles(v.box ?? [0, 0, 1, 1], v.shape === 'disk', when, size);
  const layer = s.layer ?? LAYER;
  if (v.shape === 'rect' && v.extent) return load(wmsUrl(v.extent, size[0], size[1], when, layer));
  // A Meteosat whole Earth: fetch the flat map, then redraw it as the round planet.
  const extent = s.diskExtent ?? DISK_EXTENT;
  const [sw, sh] = sourceSize(size[0], extent);
  const flat = await load(wmsUrl(extent, sw, sh, when, layer), true);
  const src = document.createElement('canvas');
  src.width = sw;
  src.height = sh;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(flat, 0, 0, sw, sh);
  const round = reprojectDisk(sctx.getImageData(0, 0, sw, sh), size[0], extent, s.lon);
  const out = document.createElement('canvas');
  out.width = out.height = size[0];
  out.getContext('2d')!.putImageData(new ImageData(round.data, size[0], size[0]), 0, 0);
  return toImage(out);
}

/** Himawari: fetch the tiles a view needs from this lab's relay and draw them on a canvas. The
 * whole disk is scaled slightly so the planet fills the picture the way NOAA's does. */
async function stitchTiles(box: Box, disk: boolean, when: Date, size: Size): Promise<HTMLImageElement> {
  const [w, h] = size;
  const zoom = zoomFor(box, w);
  const plan = tilePlan(box, zoom, w, h, disk ? 0.4994 / FILL : 1);
  const tiles = await Promise.all(plan.map((t) => load(tileUrl(when, zoom, t.row, t.col))));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // Round each tile's edges out a pixel so no seams show between them.
  plan.forEach((t, i) => {
    const x = Math.floor(t.x);
    const y = Math.floor(t.y);
    ctx.drawImage(tiles[i], x, y, Math.ceil(t.x + t.size) - x, Math.ceil(t.y + t.size) - y);
  });
  return toImage(canvas);
}

/** CIRA lists the scans it has; the page asks for that list through its relay. */
async function ciraTimes(): Promise<Date[]> {
  const res = await fetch(timesUrl());
  if (!res.ok) return [];
  return parseTimes(await res.json());
}

/** The scan times to try, newest first. NOAA posts each GOES scan 5 to 25 minutes after it
 * starts, so the page probes. EUMETSAT's map service always answers with the nearest scan it
 * has, so probing can't tell; instead the page asks for the latest on-the-hour scan that's at
 * least 35 minutes old (EUMETSAT posts in about 25), which is also what keeps it within
 * EUMETSAT's free "Core" data. */
async function scanTimes(s: Satellite, v: View): Promise<Date[]> {
  if (s.source === 'noaa') return candidates(new Date(), v);
  if (s.source === 'cira') return ciraTimes().catch(() => []);
  const first = alignDown(new Date(Date.now() - 35 * 60_000), v);
  return [first, new Date(first.getTime() - 3_600_000)];
}

/** Tries scan times newest first with the smallest picture, which is quick to fetch and
 * doubles as a placeholder while the full-size one loads. */
async function findLatest(s: Satellite, v: View): Promise<{ when: Date; preview: HTMLImageElement } | null> {
  for (const when of await scanTimes(s, v)) {
    try {
      const preview = await loadPicture(s, v, when, v.sizes[0]);
      return { when, preview };
    } catch {
      /* Not posted yet, or skipped: try the scan before. */
    }
  }
  return null;
}

function neededPx(v: View) {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const ratio = v.sizes[0][0] / v.sizes[0][1];
  // (Ignores the trims: a few percent either way doesn't change which size is picked.)
  // The picture is fitted inside the stage, so its width is the smaller of the two fits.
  const width = Math.min(r.width, r.height * ratio);
  return Math.ceil(width * dpr);
}

/** Shapes the frame for one picture size: its proportions after trimming NOAA's logo and
 * caption off the bottom (and, for some sizes, a strip off the left edge). */
function setFrameShape(v: View, size: Size = v.sizes[0]) {
  const [w, h, bottom, left] = size;
  const ratio = (w * (1 - left)) / (h * (1 - bottom));
  frame.style.setProperty('--ratio', String(ratio));
  frame.style.setProperty('--trim-left', String(left));
  stage.style.setProperty('--stage-ratio', String(ratio));
  frame.dataset.shape = v.shape;
}

function show(el: HTMLImageElement, when: Date) {
  const old = img.src;
  img.src = el.src;
  if (old !== el.src && !lapse?.frames.some((f) => f.img.src === old)) release(old);
  shown = when;
  img.alt = altText(when);
  renderWhen();
}

async function showLatest(reason: 'start' | 'change' | 'refresh') {
  const token = ++loadToken;
  if (reason !== 'refresh') {
    setStatus('Finding the newest picture…');
    frame.classList.add('is-loading');
  }
  const found = await findLatest(sat, view);
  if (token !== loadToken) return;
  if (!found) {
    frame.classList.remove('is-loading');
    setStatus('NOAA’s image server isn’t answering right now. This page tries again every minute.');
    return;
  }
  if (reason === 'refresh' && latest && found.when.getTime() <= latest.getTime()) {
    release(found.preview.src);
    return;
  }
  latest = found.when;
  // The frame takes the full-size picture's shape. The small copy shows blurred in the
  // meantime (is-loading), so any of NOAA's overlay it has stays unreadable.
  const size = pickSize(view, neededPx(view), detail);
  if (reason !== 'refresh') {
    setFrameShape(view, size);
    show(found.preview, found.when);
  }
  setStatus(reason === 'refresh' ? '' : 'Loading the full-size picture…');
  try {
    const full = await loadPicture(sat, view, found.when, size);
    if (token !== loadToken) return release(full.src);
    setFrameShape(view, size);
    show(full, found.when);
    release(found.preview.src);
    setStatus('');
  } catch {
    if (token !== loadToken) return;
    setFrameShape(view, view.sizes[0]);
    show(found.preview, found.when);
    setStatus('The full-size picture didn’t load, so this is a smaller one.');
  } finally {
    if (token === loadToken) frame.classList.remove('is-loading');
  }
}

function setStatus(text: string) {
  statusEl.textContent = text;
  statusEl.hidden = !text;
}

// ---------- Words on screen ----------

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const utcFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

function ago(when: Date) {
  const minutes = Math.round((Date.now() - when.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} min` : ''} ago`;
}

function localTime(when: Date) {
  const sameDay = new Date().toDateString() === when.toDateString();
  return `${sameDay ? '' : `${dayFmt.format(when)} `}${timeFmt.format(when)}`;
}

function renderWhen() {
  if (!shown) {
    whenEl.textContent = '';
    return;
  }
  const lead = mode === 'live' ? 'Scan started' : 'This frame';
  whenEl.textContent = `${lead} ${localTime(shown)} your time (${utcFmt.format(shown)} UTC), ${ago(shown)}.`;
}

function renderWhat() {
  whatEl.textContent = view.label;
  $<HTMLElement>('[data-sat-name]', root).textContent = sat.name;
  creditEl.textContent = credit(sat);
}

function credit(s: Satellite) {
  const year = new Date().getUTCFullYear();
  if (s.source === 'noaa') return `Imagery: NOAA/NESDIS/STAR, ${s.craft} GeoColor.`;
  if (s.source === 'cira') return `Imagery: CIRA/RAMMB SLIDER, ${s.craft} GeoColor. Himawari data from JMA.`;
  const product = s.layer?.includes('natural') ? 'Natural Colour' : 'GeoColour';
  return `Imagery: contains modified EUMETSAT Meteosat data ${year}, ${s.craft} ${product}.`;
}

function altText(when: Date) {
  const place = view.id === 'earth' ? 'the whole Earth' : view.label;
  return `Satellite picture of ${place} from ${sat.name}, scanned at ${localTime(when)} your time.`;
}

// ---------- Controls ----------

function fillViews() {
  viewSelect.replaceChildren();
  const whole = document.createElement('optgroup');
  whole.label = 'Wide views';
  const regions = document.createElement('optgroup');
  regions.label = 'Regions';
  for (const v of sat.views) {
    const opt = new Option(v.label, v.id, false, v.id === view.id);
    (v.group === 'whole' ? whole : regions).append(opt);
  }
  viewSelect.append(whole, regions);
}

function syncRadios() {
  for (const el of root.querySelectorAll<HTMLInputElement>('input[name="sat"]')) el.checked = el.value === sat.id;
  for (const el of root.querySelectorAll<HTMLInputElement>('input[name="detail"]')) el.checked = el.value === detail;
  for (const el of root.querySelectorAll<HTMLInputElement>('input[name="time"]')) el.checked = el.value === mode;
}

function renderLighting() {
  const now = new Date();
  for (const s of SATELLITES) {
    const el = root.querySelector(`[data-light="${s.id}"]`);
    if (el) el.textContent = lightingFor(s.lon, now);
  }
  drawStrip(now);
}

/** The sky strip: the equator from 180° to 180°, the daylit half shaded, the sun at the
 * longitude where it's noon, and each satellite at its parking spot. */
function drawStrip(now: Date) {
  const W = 360;
  const x = (lon: number) => ((lon + 180) / 360) * W;
  const sun = subsolarPoint(now).lon;
  const day = $<SVGGElement>('[data-day]', strip);
  day.replaceChildren();
  // The daylit half: 90° either side of the sun, wrapping around the edges.
  const from = sun - 90;
  const parts: [number, number][] =
    from < -180
      ? [[from + 360, 180], [-180, sun + 90]]
      : sun + 90 > 180
        ? [[from, 180], [-180, sun + 90 - 360]]
        : [[from, sun + 90]];
  for (const [a, b] of parts) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', String(x(a)));
    r.setAttribute('width', String(x(b) - x(a)));
    r.setAttribute('y', '23');
    r.setAttribute('height', '6');
    r.setAttribute('class', 'strip-day');
    day.append(r);
  }
  $<SVGElement>('[data-sun]', strip).setAttribute('transform', `translate(${x(sun)} 26)`);
  for (const s of SATELLITES) {
    const g = strip.querySelector(`[data-sat-mark="${s.id}"]`);
    g?.setAttribute('transform', `translate(${x(s.lon)} 26)`);
    g?.classList.toggle('is-current', s.id === sat.id);
  }
  $<SVGTextElement>('[data-sun-label]', strip).textContent = `Noon at ${formatLon(sun)}`;
}

function changeSatellite(id: string) {
  const next = SATELLITES.find((s) => s.id === id);
  if (!next || next === sat) return;
  sat = next;
  // Keep the same region when the other satellite has it; otherwise go back to the whole Earth.
  view = sat.views.find((v) => v.id === view.id) ?? sat.views[0];
  fillViews();
  afterChange();
  track('Changed Satellite', { satellite: sat.id, view: view.id });
}

function changeView(id: string) {
  const next = sat.views.find((v) => v.id === id);
  if (!next || next === view) return;
  view = next;
  afterChange();
  track('Changed View', { satellite: sat.id, view: view.id });
}

function afterChange() {
  stopLapse();
  mode = 'live';
  latest = null;
  setFrameShape(view);
  renderWhat();
  renderLighting();
  syncRadios();
  saveUrl();
  showLatest('change');
}

// ---------- Time-lapse ----------

async function startLapse(hours: number) {
  stopLapse();
  const token = ++loadToken;
  frame.classList.add('is-loading');
  setStatus('Finding the newest picture…');
  const found = latest ? { when: latest } : await findLatest(sat, view);
  if (token !== loadToken) return;
  if (!found) {
    setStatus('NOAA’s image server isn’t answering right now. Try again in a minute.');
    frame.classList.remove('is-loading');
    return;
  }
  latest = found.when;
  const times = lapseFrames(found.when, view, hours);
  const size = lapseSize(view);
  setFrameShape(view, size);
  let done = 0;
  setStatus(`Loading ${times.length} frames…`);
  const results = await Promise.all(
    times.map(async (when) => {
      try {
        const el = await loadPicture(sat, view, when, size);
        return { when, img: el };
      } catch {
        return null; // NOAA skips a scan now and then; the loop just goes without it.
      } finally {
        done += 1;
        if (token === loadToken) setStatus(`Loading frames: ${done} of ${times.length}`);
      }
    }),
  );
  if (token !== loadToken) return;
  const frames = results.filter((r): r is { when: Date; img: HTMLImageElement } => r !== null);
  frame.classList.remove('is-loading');
  if (frames.length < 2) {
    setStatus('Not enough frames came back for a time-lapse. Showing the newest picture instead.');
    mode = 'live';
    syncRadios();
    showLatest('change');
    return;
  }
  setStatus('');
  lapse = { frames, index: frames.length - 1, timer: null };
  scrub.max = String(frames.length - 1);
  scrub.value = scrub.max;
  lapseRow.hidden = false;
  showFrame(frames.length - 1);
  // With reduced motion on, the loop waits for Play; otherwise it starts on its own.
  if (!reducedMotion.matches) play();
  else setPlaying(false);
}

function showFrame(i: number) {
  if (!lapse) return;
  lapse.index = i;
  const f = lapse.frames[i];
  img.src = f.img.src;
  shown = f.when;
  img.alt = altText(f.when);
  scrub.value = String(i);
  scrub.setAttribute('aria-valuetext', `${localTime(f.when)} your time`);
  renderWhen();
}

function play() {
  if (!lapse) return;
  setPlaying(true);
  const tick = () => {
    if (!lapse) return;
    const next = lapse.index + 1;
    if (next >= lapse.frames.length) {
      // Hold on the newest frame for a moment, then loop.
      lapse.timer = window.setTimeout(() => {
        if (!lapse) return;
        showFrame(0);
        lapse.timer = window.setTimeout(tick, 120);
      }, 1200);
      return;
    }
    showFrame(next);
    lapse.timer = window.setTimeout(tick, 120);
  };
  if (lapse.index >= lapse.frames.length - 1) showFrame(0);
  lapse.timer = window.setTimeout(tick, 120);
}

function pause() {
  if (lapse?.timer) clearTimeout(lapse.timer);
  if (lapse) lapse.timer = null;
  setPlaying(false);
}

function setPlaying(on: boolean) {
  playBtn.textContent = on ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-pressed', String(on));
}

function stopLapse() {
  pause();
  for (const f of lapse?.frames ?? []) if (f.img.src !== img.src) release(f.img.src);
  lapse = null;
  lapseRow.hidden = true;
}

// ---------- Full screen and hiding the console ----------

let idleTimer: number | null = null;

function setConsoleHidden(hidden: boolean) {
  root.classList.toggle('console-hidden', hidden);
  showBtn.hidden = !hidden;
}

function wake() {
  if (!document.fullscreenElement) return;
  root.classList.remove('is-idle');
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    // Don't hide what someone is using.
    if (!root.contains(document.activeElement) || document.activeElement === document.body || document.activeElement === root) {
      root.classList.add('is-idle');
    }
  }, 4000);
}

// ---------- Wiring ----------

function init() {
  setFrameShape(view);
  fillViews();
  renderWhat();
  renderLighting();
  syncRadios();
  saveUrl();
  showLatest('start');

  $<HTMLFormElement>('.console', root).addEventListener('submit', (e) => e.preventDefault());

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.name === 'sat') changeSatellite(t.value);
    else if (t === viewSelect) changeView(t.value);
    else if (t.name === 'detail') {
      detail = t.value as Detail;
      safeSet('live-earth:detail', detail);
      saveUrl();
      track('Changed Detail', { detail, view: view.id });
      if (mode === 'live') showLatest('change');
    } else if (t.name === 'time') {
      mode = t.value as Mode;
      if (mode === 'live') {
        stopLapse();
        showLatest('change');
      } else {
        startLapse(Number(mode));
        track('Played Time-lapse', { hours: Number(mode), satellite: sat.id, view: view.id });
      }
      renderWhen();
    }
  });

  scrub.addEventListener('input', () => {
    pause();
    showFrame(Number(scrub.value));
  });

  playBtn.addEventListener('click', () => (lapse?.timer ? pause() : play()));

  hideBtn.addEventListener('click', () => {
    setConsoleHidden(true);
    showBtn.focus();
  });
  showBtn.addEventListener('click', () => {
    setConsoleHidden(false);
    hideBtn.focus();
  });

  if (root.requestFullscreen) {
    fullBtn.hidden = false;
    fullBtn.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else {
          await root.requestFullscreen();
          track('Entered Fullscreen', { satellite: sat.id, view: view.id });
        }
      } catch {
        /* The browser said no (an embedded frame, for example). The page still works. */
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === root;
      fullBtn.textContent = on ? 'Exit full screen' : 'Full screen';
      root.classList.toggle('is-full', on);
      if (on) wake();
      else {
        root.classList.remove('is-idle');
        if (idleTimer) clearTimeout(idleTimer);
      }
      // A bigger stage may want a bigger picture.
      if (mode === 'live' && latest) showLatest('change');
    });
    for (const type of ['pointermove', 'pointerdown', 'keydown']) root.addEventListener(type, wake);
  }

  // Check for a newer picture every minute while the page is visible, and keep the
  // "minutes ago" and the sky strip current.
  setInterval(() => {
    if (document.hidden) return;
    renderWhen();
    renderLighting();
    if (mode === 'live') showLatest('refresh');
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && mode === 'live') showLatest('refresh');
  });

  // Resizing past a size step (rotating a tablet, dragging a window) gets a sharper picture.
  let resizeTimer: number | null = null;
  let lastNeed = neededPx(view);
  new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const need = neededPx(view);
      if (mode === 'live' && latest && pickSize(view, need, detail)[0] > pickSize(view, lastNeed, detail)[0]) showLatest('change');
      lastNeed = need;
    }, 400);
  }).observe(stage);
}

init();
