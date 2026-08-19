import { state } from "./state.js";
import { canvas, ctx, videoEl, statusText, undoBtn } from "./dom.js";
import { COUNTDOWN_SECONDS, SNAP_DISTANCE_RATIO, DISPLACE_ANIM_MS, UNDO_STACK_LIMIT } from "./constants.js";
import { applyPhotoboothEffect } from "./filters.js";
import { playShutterSound, playSnapSound, playSolveSound } from "./audio.js";
import { applyBWInsideBox, updateProgressBadge, isPointInBoard, formatElapsed } from "./renderer.js";
import { updateCaptureButtonAvailability, updateUndoAvailability } from "./uiState.js";

// --- Timer + move counter ------------------------------------------------
export function resetPuzzleStats() {
  state.puzzleStats.startedAt = performance.now();
  state.puzzleStats.moveCount = 0;
  state.puzzleStats.elapsedLabel = "0:00";
}

// --- Undo history ----------------------------------------------------------
export function pushUndoSnapshot() {
  if (!state.puzzle.pieces.length) return;
  const snapshot = state.puzzle.pieces.map((p) => ({ row: p.row, col: p.col, x: p.x, y: p.y, placed: p.placed }));
  state.undoStack.push(snapshot);
  if (state.undoStack.length > UNDO_STACK_LIMIT) state.undoStack.shift();
  updateUndoAvailability();
}

export function undoLastMove() {
  if (state.undoStack.length === 0 || state.appState !== "puzzle") return;
  const snapshot = state.undoStack.pop();
  snapshot.forEach((entry, i) => {
    const piece = state.puzzle.pieces[i];
    if (!piece) return;
    piece.x = entry.x;
    piece.y = entry.y;
    piece.placed = entry.placed;
  });
  state.puzzle.solved = reconcileSolvedWithSound(state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
  updateProgressBadge();
  updateUndoAvailability();
  statusText.textContent = "move undone";
}

export function initUndoControls() {
  if (undoBtn) undoBtn.addEventListener("click", undoLastMove);
}

// --- Puzzle lifecycle --------------------------------------------------
export function resetPuzzleOnly() {
  state.puzzle.boardBox = null;
  state.puzzle.pieces = [];
  state.puzzle.solved = false;
  state.puzzle.fullPhotoboothCanvas = null;
  state.appState = "tracking";
  state.countdown.active = false;
  state.drag.activeHand = null;
  state.drag.piece = null;
  state.shatter.active = false;
  state.shatter.fragments = [];
  state.shatter.pendingCanvas = null;
  state.fistHoldCounter = 0;
  state.lastSeenFrame.box = null;
  state.lastSeenFrame.at = 0;
  state.undoStack = [];
  updateUndoAvailability();
  updateProgressBadge();
  updateCaptureButtonAvailability();
}

export function startCountdown(frameBox) {
  state.puzzle.boardBox = { ...frameBox };
  state.appState = "countdown";
  state.countdown.active = true;
  state.countdown.startedAt = performance.now();
  updateCaptureButtonAvailability();
}

export function drawCountdownOverlay(box) {
  const elapsed = (performance.now() - state.countdown.startedAt) / 1000;
  const remaining = COUNTDOWN_SECONDS - elapsed;

  if (remaining <= 0) {
    finishCountdownAndCapture(box);
    return;
  }

  applyBWInsideBox(box);

  ctx.save();
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const n = Math.ceil(remaining);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  ctx.fillStyle = "rgba(10,10,8,0.45)";
  ctx.fillRect(box.x, box.y, box.width, box.height);

  ctx.font = `${Math.max(48, Math.min(box.width, box.height) * 0.4)}px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = "#f5c518";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy);
  ctx.restore();

  statusText.textContent = `capturing in ${n}…`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function finishCountdownAndCapture(box) {
  state.countdown.active = false;
  playShutterSound();

  const mirroredFrame = document.createElement("canvas");
  mirroredFrame.width = canvas.width;
  mirroredFrame.height = canvas.height;
  const mirroredCtx = mirroredFrame.getContext("2d");
  mirroredCtx.save();
  mirroredCtx.translate(mirroredFrame.width, 0);
  mirroredCtx.scale(-1, 1);
  mirroredCtx.drawImage(videoEl, 0, 0, mirroredFrame.width, mirroredFrame.height);
  mirroredCtx.restore();

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(box.width));
  cropCanvas.height = Math.max(1, Math.round(box.height));
  const cropCtx = cropCanvas.getContext("2d");
  cropCtx.drawImage(
    mirroredFrame,
    box.x, box.y, box.width, box.height,
    0, 0, cropCanvas.width, cropCanvas.height
  );

  const fullImageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  applyPhotoboothEffect(fullImageData);
  cropCtx.putImageData(fullImageData, 0, 0);

  state.puzzle.fullPhotoboothCanvas = cropCanvas;

  const GRID = state.GRID;
  const tileW = Math.floor(cropCanvas.width / GRID);
  const tileH = Math.floor(cropCanvas.height / GRID);
  const pieces = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const sx = col * tileW;
      const sy = row * tileH;
      const w = col === GRID - 1 ? cropCanvas.width - sx : tileW;
      const h = row === GRID - 1 ? cropCanvas.height - sy : tileH;

      const pieceCanvas = document.createElement("canvas");
      pieceCanvas.width = w;
      pieceCanvas.height = h;
      pieceCanvas.getContext("2d").drawImage(cropCanvas, sx, sy, w, h, 0, 0, w, h);

      pieces.push({
        row, col,
        canvas: pieceCanvas,
        w, h,
        x: 0, y: 0,
        placed: false,
        dragging: false,
      });
    }
  }

  const slots = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      slots.push({ x: box.x + col * tileW, y: box.y + row * tileH });
    }
  }
  shuffle(slots);

  pieces.forEach((piece, i) => {
    piece.x = slots[i].x;
    piece.y = slots[i].y;
    if (isNearOwnCell(piece, box, tileW, tileH)) {
      snapPieceToCell(piece, box, tileW, tileH);
    }
  });

  state.puzzle.boardBox = box;
  state.puzzle.pieces = pieces;
  state.puzzle.tileW = tileW;
  state.puzzle.tileH = tileH;
  state.puzzle.solved = pieces.every((p) => p.placed);
  state.appState = "puzzle";
  state.fistHoldCounter = 0;
  resetPuzzleStats();
  state.undoStack = [];
  updateUndoAvailability();
  updateProgressBadge();
}

// --- Piece placement logic ------------------------------------------------
export function isNearOwnCell(piece, box, tileW, tileH) {
  const correctX = box.x + piece.col * tileW;
  const correctY = box.y + piece.row * tileH;
  const dx = piece.x - correctX;
  const dy = piece.y - correctY;
  const tolerance = Math.min(tileW, tileH) * SNAP_DISTANCE_RATIO;
  return Math.sqrt(dx * dx + dy * dy) < tolerance;
}

export function reconcilePlacedState(box, tileW, tileH) {
  if (!box || !state.puzzle.pieces.length) return false;
  for (const piece of state.puzzle.pieces) {
    if (piece.displacing || piece.dragging) continue;
    piece.placed = isNearOwnCell(piece, box, tileW, tileH);
  }
  return state.puzzle.pieces.every((p) => p.placed);
}

export function reconcileSolvedWithSound(box, tileW, tileH) {
  const wasSolved = state.puzzle.solved;
  const nowSolved = reconcilePlacedState(box, tileW, tileH);
  if (nowSolved && !wasSolved) playSolveSound();
  return nowSolved;
}

export function snapPieceToCell(piece, box, tileW, tileH) {
  displaceCellOccupant(piece, piece.row, piece.col, box, tileW, tileH);
  piece.x = box.x + piece.col * tileW;
  piece.y = box.y + piece.row * tileH;
  const wasPlaced = piece.placed;
  piece.placed = true;
  if (!wasPlaced) playSnapSound();
}

export function displaceCellOccupant(piece, targetRow, targetCol, box, tileW, tileH) {
  const GRID = state.GRID;
  const cellX = box.x + targetCol * tileW;
  const cellY = box.y + targetRow * tileH;

  const occupant = state.puzzle.pieces.find((p) => {
    if (p === piece || p.displacing) return false;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    return (
      cx >= cellX && cx < cellX + tileW &&
      cy >= cellY && cy < cellY + tileH
    );
  });
  if (!occupant) return;

  if (occupant.row === targetRow && occupant.col === targetCol && occupant.placed) {
    return;
  }

  occupant.placed = false;

  const freeCells = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (row === targetRow && col === targetCol) continue;
      const cx0 = box.x + col * tileW;
      const cy0 = box.y + row * tileH;
      const taken = state.puzzle.pieces.some((p) => {
        if (p === occupant || p === piece || p.displacing) return false;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        return cx >= cx0 && cx < cx0 + tileW && cy >= cy0 && cy < cy0 + tileH;
      });
      if (!taken) freeCells.push({ row, col });
    }
  }

  let targetSlot;
  if (freeCells.length > 0) {
    targetSlot = freeCells[Math.floor(Math.random() * freeCells.length)];
  } else {
    targetSlot = { row: occupant.row, col: occupant.col };
  }

  const jitterX = (Math.random() - 0.5) * tileW * 0.5;
  const jitterY = (Math.random() - 0.5) * tileH * 0.5;
  const targetX = box.x + targetSlot.col * tileW + jitterX;
  const targetY = box.y + targetSlot.row * tileH + jitterY;

  animateDisplacement(occupant, targetX, targetY);
}

function animateDisplacement(piece, targetX, targetY) {
  const startX = piece.x;
  const startY = piece.y;
  const startedAt = performance.now();

  piece.displacing = true;

  function step() {
    const t = Math.min(1, (performance.now() - startedAt) / DISPLACE_ANIM_MS);
    const eased = 1 - Math.pow(1 - t, 3);

    piece.x = startX + (targetX - startX) * eased;
    piece.y = startY + (targetY - startY) * eased;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      piece.x = targetX;
      piece.y = targetY;
      piece.displacing = false;
      clampPieceToBoard(piece);
    }
  }

  requestAnimationFrame(step);
}

function findNearestPiece(px, py) {
  let best = null;
  let bestDist = Infinity;
  for (const piece of state.puzzle.pieces) {
    if (piece.displacing) continue;
    const cx = piece.x + piece.w / 2;
    const cy = piece.y + piece.h / 2;
    const d = Math.hypot(px - cx, py - cy);
    if (d < Math.max(piece.w, piece.h) * 0.75 && d < bestDist) {
      best = piece;
      bestDist = d;
    }
  }
  return best;
}

export function handleDragForHand(handLabel, pinching, indexPx) {
  const drag = state.drag;
  if (pinching) {
    if (drag.activeHand === null) {
      const candidate = findNearestPiece(indexPx.x, indexPx.y);
      if (candidate) {
        pushUndoSnapshot();
        drag.activeHand = handLabel;
        drag.piece = candidate;
        drag.offsetX = indexPx.x - candidate.x;
        drag.offsetY = indexPx.y - candidate.y;
        candidate.dragging = true;
        candidate.placed = false;
      }
    } else if (drag.activeHand === handLabel && drag.piece) {
      drag.piece.x = indexPx.x - drag.offsetX;
      drag.piece.y = indexPx.y - drag.offsetY;
    }
  } else {
    if (drag.activeHand === handLabel && drag.piece) {
      const piece = drag.piece;
      piece.dragging = false;
      if (isNearOwnCell(piece, state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH)) {
        snapPieceToCell(piece, state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      } else {
        clampPieceToBoard(piece);
        const box = state.puzzle.boardBox;
        const cx = piece.x + piece.w / 2;
        const cy = piece.y + piece.h / 2;
        const dropCol = Math.min(
          state.GRID - 1,
          Math.max(0, Math.floor((cx - box.x) / state.puzzle.tileW))
        );
        const dropRow = Math.min(
          state.GRID - 1,
          Math.max(0, Math.floor((cy - box.y) / state.puzzle.tileH))
        );
        displaceCellOccupant(piece, dropRow, dropCol, box, state.puzzle.tileW, state.puzzle.tileH);
      }
      drag.activeHand = null;
      drag.piece = null;
      state.puzzle.solved = reconcileSolvedWithSound(state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      state.puzzleStats.moveCount++;
      updateProgressBadge();
      updateUndoAvailability();
    }
  }
}

export function clampPieceToBoard(piece) {
  const box = state.puzzle.boardBox;
  piece.x = Math.min(Math.max(piece.x, box.x), box.x + box.width - piece.w);
  piece.y = Math.min(Math.max(piece.y, box.y), box.y + box.height - piece.h);
}

// --- Pointer (mouse/touch) drag support ------------------------------------
function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function finishPointerDrag(point) {
  if (state.drag.activeHand !== "pointer" || !state.drag.piece) return;
  handleDragForHand("pointer", false, point);
}

export function initPointerAndKeyboardControls() {
  canvas.addEventListener("pointerdown", (event) => {
    if (state.appState !== "puzzle" || state.drag.activeHand !== null) return;

    const point = canvasPointFromEvent(event);
    if (!isPointInBoard(point.x, point.y, state.puzzle.boardBox)) return;

    canvas.setPointerCapture(event.pointerId);
    handleDragForHand("pointer", true, point);
    if (state.drag.piece) {
      state.puzzle.pieces.forEach((piece) => {
        piece.keyboardSelected = piece === state.drag.piece;
      });
    }
    canvas.focus({ preventScroll: true });
  });

  canvas.addEventListener("pointermove", (event) => {
    if (state.drag.activeHand !== "pointer") return;
    handleDragForHand("pointer", true, canvasPointFromEvent(event));
  });

  canvas.addEventListener("pointerup", (event) => {
    finishPointerDrag(canvasPointFromEvent(event));
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointercancel", (event) => {
    finishPointerDrag(canvasPointFromEvent(event));
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("keydown", (event) => {
    if (state.appState !== "puzzle" || state.drag.activeHand !== null) return;

    const pieceNumber = Number(event.key);
    if (pieceNumber >= 1 && pieceNumber <= state.puzzle.pieces.length) {
      state.puzzle.pieces.forEach((candidate, index) => {
        candidate.keyboardSelected = index === pieceNumber - 1;
      });
      statusText.textContent = `piece ${pieceNumber} selected`;
      event.preventDefault();
      return;
    }

    const piece = state.puzzle.pieces.find((candidate) => candidate.keyboardSelected);
    if (!piece) return;

    const step = Math.max(8, Math.round(Math.min(state.puzzle.tileW, state.puzzle.tileH) * 0.12));
    const movement = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key];

    if (movement) {
      event.preventDefault();
      pushUndoSnapshot();
      piece.x += movement.x;
      piece.y += movement.y;
      clampPieceToBoard(piece);
      state.puzzle.solved = reconcileSolvedWithSound(state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      state.puzzleStats.moveCount++;
      updateProgressBadge();
      updateUndoAvailability();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pushUndoSnapshot();
      snapPieceToCell(piece, state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      state.puzzle.solved = reconcileSolvedWithSound(state.puzzle.boardBox, state.puzzle.tileW, state.puzzle.tileH);
      state.puzzleStats.moveCount++;
      updateProgressBadge();
      updateUndoAvailability();
    }
  });
}
