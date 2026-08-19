import { state } from "./state.js";
import { captureBtn, undoBtn } from "./dom.js";

export function isStripFull() {
  return state.galleryEntries.length >= state.STRIP_MAX_PHOTOS;
}

export function updateCaptureButtonAvailability() {
  if (!captureBtn) return;
  captureBtn.disabled = state.appState !== "tracking" || isStripFull();
}

export function updateUndoAvailability() {
  if (!undoBtn) return;
  undoBtn.disabled = state.undoStack.length === 0 || state.appState !== "puzzle";
}
