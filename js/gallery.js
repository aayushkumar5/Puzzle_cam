import { state } from "./state.js";
import {
  galleryStrip, galleryEmpty, galleryCount, downloadStripBtn, resetAllBtn,
  stripCompleteMsg, stripLengthSelect, statusText,
} from "./dom.js";
import { STRIP_FILE_BORDER, STRIP_FILE_GAP, STRIP_FILE_BG, STORAGE_KEY } from "./constants.js";
import { playSaveSound } from "./audio.js";
import { isStripFull, updateCaptureButtonAvailability } from "./uiState.js";
import { resetPuzzleOnly } from "./puzzleEngine.js";

export { isStripFull };

export function addToGallery(snapshotCanvas, stats, skipPersist) {
  if (state.galleryEntries.length >= state.STRIP_MAX_PHOTOS) return;

  state.galleryEntries.push({ canvas: snapshotCanvas, time: Date.now(), stats: stats || null });
  renderGalleryThumb(snapshotCanvas, state.galleryEntries.length, stats);
  galleryCount.textContent = `${state.galleryEntries.length} / ${state.STRIP_MAX_PHOTOS}`;
  if (galleryEmpty) galleryEmpty.style.display = "none";
  if (!skipPersist) playSaveSound();
  if (!skipPersist) persistGalleryToStorage();

  if (state.galleryEntries.length >= state.STRIP_MAX_PHOTOS) {
    showStripComplete();
  }
}

export function setStripMaxPhotos(newMax) {
  state.STRIP_MAX_PHOTOS = newMax;
  galleryCount.textContent = `${state.galleryEntries.length} / ${state.STRIP_MAX_PHOTOS}`;
  if (state.galleryEntries.length >= state.STRIP_MAX_PHOTOS) {
    showStripComplete();
  } else {
    hideStripComplete();
  }
  updateStripDownloadAvailability();
  updateCaptureButtonAvailability();
}

export function showStripComplete() {
  if (stripCompleteMsg) stripCompleteMsg.classList.add("visible");
  updateStripDownloadAvailability();
  updateCaptureButtonAvailability();
}

export function hideStripComplete() {
  if (stripCompleteMsg) stripCompleteMsg.classList.remove("visible");
}

export function updateStripDownloadAvailability() {
  if (!downloadStripBtn) return;
  downloadStripBtn.disabled = state.galleryEntries.length === 0;
}

export function downloadPhotoStrip() {
  if (state.galleryEntries.length === 0) return;

  const entries = state.galleryEntries;
  const targetW = entries[0].canvas.width;
  const scaledHeights = entries.map((entry) =>
    Math.round(entry.canvas.height * (targetW / entry.canvas.width))
  );

  const totalH =
    STRIP_FILE_BORDER * 2 +
    scaledHeights.reduce((sum, h) => sum + h, 0) +
    STRIP_FILE_GAP * (entries.length - 1);
  const totalW = targetW + STRIP_FILE_BORDER * 2;

  const stripCanvas = document.createElement("canvas");
  stripCanvas.width = totalW;
  stripCanvas.height = totalH;
  const stripCtx = stripCanvas.getContext("2d");

  stripCtx.fillStyle = STRIP_FILE_BG;
  stripCtx.fillRect(0, 0, totalW, totalH);

  let cursorY = STRIP_FILE_BORDER;
  entries.forEach((entry, i) => {
    const h = scaledHeights[i];
    stripCtx.drawImage(entry.canvas, STRIP_FILE_BORDER, cursorY, targetW, h);
    cursorY += h + STRIP_FILE_GAP;
  });

  stripCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `puzzlecam_strip_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}

export function resetEverything() {
  state.galleryEntries.length = 0;
  galleryStrip.innerHTML = "";
  galleryCount.textContent = `0 / ${state.STRIP_MAX_PHOTOS}`;
  if (galleryEmpty) {
    galleryEmpty.style.display = "block";
    galleryStrip.appendChild(galleryEmpty);
  }
  hideStripComplete();
  updateStripDownloadAvailability();
  resetPuzzleOnly();
  clearGalleryStorage();
  statusText.textContent = "everything reset";
}

function renderGalleryThumb(snapshotCanvas, index, stats) {
  const print = document.createElement("div");
  print.className = "print";

  const thumbCanvas = document.createElement("canvas");
  const THUMB_W = 220;
  const scale = THUMB_W / snapshotCanvas.width;
  thumbCanvas.width = THUMB_W;
  thumbCanvas.height = Math.round(snapshotCanvas.height * scale);
  thumbCanvas.getContext("2d").drawImage(snapshotCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

  const label = document.createElement("div");
  label.className = "print-label";
  const statsSuffix = stats ? ` · ${stats.moveCount} moves · ${stats.elapsedLabel}` : "";
  label.textContent = `#${String(index).padStart(2, "0")}${statsSuffix}`;

  print.appendChild(thumbCanvas);
  print.appendChild(label);
  galleryStrip.insertBefore(print, galleryStrip.firstChild);
}

// --- localStorage persistence --------------------------------------------
function persistGalleryToStorage() {
  try {
    const serializable = state.galleryEntries.map((entry) => ({
      dataUrl: entry.canvas.toDataURL("image/jpeg", 0.85),
      time: entry.time,
      stats: entry.stats,
    }));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ maxPhotos: state.STRIP_MAX_PHOTOS, entries: serializable })
    );
  } catch (err) {
    console.warn("[PuzzleCam] Could not persist gallery to localStorage:", err);
  }
}

function clearGalleryStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[PuzzleCam] Could not clear gallery storage:", err);
  }
}

function loadCanvasFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function restoreGalleryFromStorage() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return;
  }
  if (!raw) return;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return;
  }
  if (!parsed || !Array.isArray(parsed.entries) || parsed.entries.length === 0) return;

  if (parsed.maxPhotos && stripLengthSelect) {
    stripLengthSelect.value = String(parsed.maxPhotos);
    setStripMaxPhotos(parsed.maxPhotos);
  }

  for (const entry of parsed.entries) {
    try {
      const canvas = await loadCanvasFromDataUrl(entry.dataUrl);
      addToGallery(canvas, entry.stats, true);
    } catch (err) {
      console.warn("[PuzzleCam] Skipped a corrupted saved photo.", err);
    }
  }
}

export function initGalleryControls() {
  if (stripLengthSelect) {
    stripLengthSelect.addEventListener("change", () => {
      const newMax = Number(stripLengthSelect.value);
      if (state.galleryEntries.length > 0) {
        const confirmed = window.confirm(
          "Changing the strip length will reset the current strip. Continue?"
        );
        if (!confirmed) {
          stripLengthSelect.value = String(state.STRIP_MAX_PHOTOS);
          return;
        }
        resetEverything();
      }
      setStripMaxPhotos(newMax);
    });
  }

  if (downloadStripBtn) {
    downloadStripBtn.addEventListener("click", downloadPhotoStrip);
    updateStripDownloadAvailability();
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Are you sure you want to delete the entire photo strip and start over?"
      );
      if (confirmed) resetEverything();
    });
  }
}
