import { state } from "./state.js";
import { filterSelect } from "./dom.js";
import {
  PHOTOBOOTH_CONTRAST_ALPHA,
  PHOTOBOOTH_BRIGHTNESS_BETA,
  PHOTOBOOTH_NOISE_STD,
} from "./constants.js";

function gaussianNoise(std) {
  const u1 = Math.random() || 1e-6;
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * std;
}

function applyBWFilter(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let v = gray * PHOTOBOOTH_CONTRAST_ALPHA + PHOTOBOOTH_BRIGHTNESS_BETA;
    v += gaussianNoise(PHOTOBOOTH_NOISE_STD);
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  return imageData;
}

function applySepiaFilter(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let tr = 0.393 * r + 0.769 * g + 0.189 * b;
    let tg = 0.349 * r + 0.686 * g + 0.168 * b;
    let tb = 0.272 * r + 0.534 * g + 0.131 * b;
    tr += gaussianNoise(PHOTOBOOTH_NOISE_STD * 0.4);
    tg += gaussianNoise(PHOTOBOOTH_NOISE_STD * 0.4);
    tb += gaussianNoise(PHOTOBOOTH_NOISE_STD * 0.4);
    d[i] = Math.max(0, Math.min(255, tr));
    d[i + 1] = Math.max(0, Math.min(255, tg));
    d[i + 2] = Math.max(0, Math.min(255, tb));
  }
  return imageData;
}

function applyVintageFilter(imageData) {
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      let r = d[i], g = d[i + 1], b = d[i + 2];

      r = r * 1.08 + 6;
      g = g * 0.98;
      b = b * 0.82;

      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) / maxDist;
      const vignette = 1 - dist * 0.55;

      r = r * vignette + gaussianNoise(PHOTOBOOTH_NOISE_STD * 0.5);
      g = g * vignette + gaussianNoise(PHOTOBOOTH_NOISE_STD * 0.5);
      b = b * vignette + gaussianNoise(PHOTOBOOTH_NOISE_STD * 0.5);

      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
  }
  return imageData;
}

function applyColorFilter(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.max(0, Math.min(255, d[i] * PHOTOBOOTH_CONTRAST_ALPHA * 0.9 + PHOTOBOOTH_BRIGHTNESS_BETA * 0.5));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * PHOTOBOOTH_CONTRAST_ALPHA * 0.9 + PHOTOBOOTH_BRIGHTNESS_BETA * 0.5));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * PHOTOBOOTH_CONTRAST_ALPHA * 0.9 + PHOTOBOOTH_BRIGHTNESS_BETA * 0.5));
  }
  return imageData;
}

const FILTERS = {
  bw: applyBWFilter,
  sepia: applySepiaFilter,
  vintage: applyVintageFilter,
  color: applyColorFilter,
};

export function applyPhotoboothEffect(imageData) {
  const fn = FILTERS[state.currentFilter] || applyBWFilter;
  return fn(imageData);
}

export function initFilterControls() {
  if (!filterSelect) return;
  filterSelect.addEventListener("change", () => {
    state.currentFilter = filterSelect.value;
  });
}
