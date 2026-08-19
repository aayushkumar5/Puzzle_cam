import { state } from "./state.js";
import { canvas, captureBtn, difficultySelect, onboardingOverlay, onboardingDismissBtn } from "./dom.js";
import { ONBOARDING_KEY } from "./constants.js";
import { startCountdown, resetPuzzleOnly } from "./puzzleEngine.js";
import { isStripFull, updateCaptureButtonAvailability } from "./uiState.js";

// --- Fallback capture button (no gesture required) ----------------------
function triggerManualCapture() {
  if (state.appState !== "tracking" || isStripFull()) return;

  const DEFAULT_BOX_RATIO = 0.6;
  let box = state.lastSeenFrame.box;
  if (!box) {
    const w = canvas.width * DEFAULT_BOX_RATIO;
    const h = canvas.height * DEFAULT_BOX_RATIO;
    box = {
      x: (canvas.width - w) / 2,
      y: (canvas.height - h) / 2,
      width: w,
      height: h,
    };
  }
  startCountdown(box);
}

// --- Difficulty selector ---------------------------------------------------
function initDifficultyControl() {
  if (!difficultySelect) return;
  difficultySelect.addEventListener("change", () => {
    const newGrid = Number(difficultySelect.value);
    if (state.appState === "puzzle" || state.appState === "countdown" || state.appState === "shattering") {
      const confirmed = window.confirm(
        "Changing difficulty will discard the puzzle in progress. Continue?"
      );
      if (!confirmed) {
        difficultySelect.value = String(state.GRID);
        return;
      }
      resetPuzzleOnly();
    }
    state.GRID = newGrid;
  });
}

// --- Onboarding overlay (first-time users) -------------------------------
export function maybeShowOnboarding() {
  if (!onboardingOverlay) return;
  let seen = false;
  try {
    seen = localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch (err) {
    seen = false;
  }
  if (!seen) {
    onboardingOverlay.classList.remove("hidden");
  }
}

function dismissOnboarding() {
  if (onboardingOverlay) onboardingOverlay.classList.add("hidden");
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch (err) {
    /* ignore */
  }
}

export function initFallbackAndMiscControls() {
  if (captureBtn) captureBtn.addEventListener("click", triggerManualCapture);
  initDifficultyControl();
  if (onboardingDismissBtn) onboardingDismissBtn.addEventListener("click", dismissOnboarding);
  updateCaptureButtonAvailability();
}
