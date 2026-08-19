import { state } from "./state.js";
import {
  videoEl, statusDot, statusText, loadingOverlay, loaderText, loaderRetry, errorBanner,
} from "./dom.js";
import { LM, FIST_HOLD_FRAMES, FRAME_GRACE_MS, LOAD_TIMEOUT_MS, FREEZE_HOLD_MS } from "./constants.js";
import {
  initWebcam, stopWebcam, initHandLandmarker,
  isPinching, isFist, mirrorLandmarkX, toPixel, computeHandFrame,
} from "./handTracking.js";
import {
  drawVideoFrame, applyBWInsideBox, drawLiveFrameOverlay, drawPinchProgressRing,
  drawBoardAndPieces, drawHandSkeletonsOverBoard, updateProgressBadge,
} from "./renderer.js";
import {
  startCountdown, drawCountdownOverlay, handleDragForHand, reconcileSolvedWithSound,
  initPointerAndKeyboardControls, initUndoControls,
} from "./puzzleEngine.js";
import { updateAndDrawShatter, handleFistReset } from "./shatterEngine.js";
import { isStripFull, initGalleryControls, restoreGalleryFromStorage } from "./gallery.js";
import { initAudioControls } from "./audio.js";
import { initFilterControls } from "./filters.js";
import { initFallbackAndMiscControls, maybeShowOnboarding } from "./controls.js";
import { updateCaptureButtonAvailability } from "./uiState.js";

function processResults(result) {
  if (state.appState === "shattering") {
    updateAndDrawShatter();
    statusText.textContent = "saving…";
    return;
  }

  const handsLandmarks = result.landmarks || [];
  const noHands = handsLandmarks.length === 0;

  if (noHands) {
    statusDot.className = state.puzzle.solved ? "status-dot solved" : "status-dot";
    state.fistHoldCounter = 0;
    state.freezeGate.holding = false;

    if (state.drag.activeHand && state.drag.piece) {
      handleDragForHand(state.drag.activeHand, false, { x: state.drag.piece.x, y: state.drag.piece.y });
    }

    if (state.appState === "tracking") {
      const sinceLastSeen = performance.now() - state.lastSeenFrame.at;
      if (state.lastSeenFrame.box && sinceLastSeen < FRAME_GRACE_MS) {
        applyBWInsideBox(state.lastSeenFrame.box);
        drawLiveFrameOverlay(state.lastSeenFrame.box);
      }
      statusText.textContent = isStripFull()
        ? "strip complete — download or reset"
        : "looking for hands…";
      return;
    }

    if (state.appState === "countdown") {
      drawCountdownOverlay(state.puzzle.boardBox);
      return;
    }

    if (state.appState === "puzzle") {
      state.puzzle.solved = reconcileSolvedWithSound(state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      updateProgressBadge();
      drawBoardAndPieces();
      statusText.textContent = state.puzzle.solved
        ? "puzzle complete! make a fist to save"
        : "solve the puzzle with pinch";
      return;
    }

    return;
  }

  statusDot.className = state.puzzle.solved ? "status-dot solved" : "status-dot live";

  const anyFist = handsLandmarks.some((lm) => isFist(lm));
  const draggingNow = state.drag.activeHand !== null && state.drag.piece !== null;
  if (anyFist && !draggingNow && state.appState !== "tracking") {
    state.fistHoldCounter++;
    if (state.fistHoldCounter >= FIST_HOLD_FRAMES) {
      state.fistHoldCounter = 0;
      handleFistReset();
      return;
    }
  } else {
    state.fistHoldCounter = 0;
  }

  if (state.appState === "tracking") {
    if (isStripFull()) {
      statusText.textContent = "strip complete — download or reset";
      return;
    }
    if (handsLandmarks.length === 2) {
      const [handA, handB] = handsLandmarks;
      const indexA = mirrorLandmarkX(handA[LM.INDEX_TIP]);
      const indexB = mirrorLandmarkX(handB[LM.INDEX_TIP]);
      const frameBox = computeHandFrame(indexA, indexB);

      if (frameBox.width > 4 && frameBox.height > 4) {
        applyBWInsideBox(frameBox);
        drawLiveFrameOverlay(frameBox);
        state.lastSeenFrame.box = frameBox;
        state.lastSeenFrame.at = performance.now();
      }

      const bothPinching = isPinching(handA) && isPinching(handB);
      if (bothPinching && frameBox.width > 40 && frameBox.height > 40) {
        if (!state.freezeGate.holding) {
          state.freezeGate.holding = true;
          state.freezeGate.since = performance.now();
        }
        statusDot.className = "status-dot armed";
        statusText.textContent = "hold the pinch…";

        const heldMs = performance.now() - state.freezeGate.since;
        drawPinchProgressRing(frameBox, Math.min(1, heldMs / FREEZE_HOLD_MS));

        if (heldMs > FREEZE_HOLD_MS) {
          state.freezeGate.holding = false;
          startCountdown(frameBox);
        }
      } else {
        state.freezeGate.holding = false;
        statusText.textContent = "tracking hands";
      }
    } else {
      state.freezeGate.holding = false;
      const sinceLastSeen = performance.now() - state.lastSeenFrame.at;
      if (state.lastSeenFrame.box && sinceLastSeen < FRAME_GRACE_MS) {
        applyBWInsideBox(state.lastSeenFrame.box);
        drawLiveFrameOverlay(state.lastSeenFrame.box);
        statusText.textContent = "tracking hands";
      } else {
        statusText.textContent = "tracking hands";
      }
    }
    return;
  }

  if (state.appState === "countdown") {
    drawCountdownOverlay(state.puzzle.boardBox);
    return;
  }

  if (state.appState === "puzzle") {
    const labelsPresent = new Set();
    handsLandmarks.forEach((lm, i) => {
      const label = i === 0 ? "A" : "B";
      labelsPresent.add(label);
      const pinching = isPinching(lm);
      const indexPx = toPixel(mirrorLandmarkX(lm[LM.INDEX_TIP]));
      handleDragForHand(label, pinching, indexPx);
    });

    if (state.drag.activeHand && !labelsPresent.has(state.drag.activeHand) && state.drag.piece) {
      handleDragForHand(state.drag.activeHand, false, { x: state.drag.piece.x, y: state.drag.piece.y });
    }

    if (!state.drag.piece) {
      state.puzzle.solved = reconcileSolvedWithSound(state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      updateProgressBadge();
    }

    drawBoardAndPieces();
    drawHandSkeletonsOverBoard(handsLandmarks, state.puzzle.boardBox);

    statusText.textContent = state.puzzle.solved
      ? (state.fistHoldCounter > 0
          ? `saving… hold the fist (${state.fistHoldCounter}/${FIST_HOLD_FRAMES})`
          : "puzzle complete! make a fist to save")
      : "solve the puzzle with pinch";
  }
}

function renderLoop() {
  if (!document.hidden && videoEl.readyState >= 2 && state.handLandmarker) {
    drawVideoFrame();
    const nowMs = performance.now();
    const result = state.handLandmarker.detectForVideo(videoEl, nowMs);
    processResults(result);
  }
  requestAnimationFrame(renderLoop);
}

function showLoaderError(message) {
  loaderText.textContent = message;
  loaderText.style.color = "#e0533d";
  loaderRetry.classList.remove("hidden");
}

function resetLoaderUI() {
  loadingOverlay.classList.remove("hidden");
  loaderText.style.color = "";
  loaderText.textContent = "loading HandLandmarker model…";
  loaderRetry.classList.add("hidden");
  errorBanner.style.display = "none";
}

async function boot() {
  resetLoaderUI();

  let settled = false;
  const watchdogMs = (LOAD_TIMEOUT_MS * 2) + 5000;
  const watchdog = setTimeout(() => {
    if (!settled) {
      showLoaderError("Loading is taking too long. Click retry or check your connection.");
    }
  }, watchdogMs);

  try {
    if (!videoEl.srcObject) {
      await initWebcam();
    }

    state.handLandmarker = await initHandLandmarker();

    settled = true;
    clearTimeout(watchdog);
    loadingOverlay.classList.add("hidden");
    statusText.textContent = "ready";
    requestAnimationFrame(renderLoop);
    updateCaptureButtonAvailability();
    maybeShowOnboarding();
  } catch (err) {
    settled = true;
    clearTimeout(watchdog);
    if (err && err.name === "NotAllowedError") {
      showLoaderError("Camera permission denied. Enable it in your browser settings and click retry.");
    } else if (err && err.name === "NotFoundError") {
      showLoaderError("No webcam was found.");
    } else {
      showLoaderError((err && err.message) || "Error starting the app.");
    }
  }
}

loaderRetry.addEventListener("click", () => {
  boot();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    videoEl.pause();
    return;
  }

  if (videoEl.srcObject) {
    videoEl.play().catch(() => {
      statusText.textContent = "resume the camera to continue";
    });
  }
});

window.addEventListener("pagehide", stopWebcam);

// Wire up all UI controls before booting
initAudioControls();
initFilterControls();
initGalleryControls();
initUndoControls();
initPointerAndKeyboardControls();
initFallbackAndMiscControls();

restoreGalleryFromStorage();
boot();
