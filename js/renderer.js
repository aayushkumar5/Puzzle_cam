import { state } from "./state.js";
import { canvas, ctx, videoEl, progressBadge, progressText } from "./dom.js";
import { HAND_CONNECTIONS } from "./constants.js";
import { applyPhotoboothEffect } from "./filters.js";
import { toPixel, mirrorLandmarkX } from "./handTracking.js";

export function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function drawVideoFrame() {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function applyBWInsideBox(box) {
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  const w = Math.min(canvas.width - x, Math.round(box.width));
  const h = Math.min(canvas.height - y, Math.round(box.height));
  if (w <= 0 || h <= 0) return;

  const region = ctx.getImageData(x, y, w, h);
  applyPhotoboothEffect(region);
  ctx.putImageData(region, x, y);
}

export function drawLiveFrameOverlay(box) {
  ctx.save();
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const cornerLen = 18;
  ctx.lineWidth = 4;
  const corners = [
    [box.x, box.y, 1, 1],
    [box.x + box.width, box.y, -1, 1],
    [box.x, box.y + box.height, 1, -1],
    [box.x + box.width, box.y + box.height, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + cornerLen * dy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + cornerLen * dx, cy);
    ctx.stroke();
  }
  ctx.restore();
}

export function isPointInBoard(px, py, box) {
  if (!box) return false;
  return (
    px >= box.x &&
    px <= box.x + box.width &&
    py >= box.y &&
    py <= box.y + box.height
  );
}

export function drawPinchProgressRing(box, progress) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const radius = 22;

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(245,197,24,0.25)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#f5c518";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(245,197,24,0.8)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.restore();
}

export function drawHandSkeleton(landmarksPx) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;

  for (const [iA, iB] of HAND_CONNECTIONS) {
    const a = landmarksPx[iA];
    const b = landmarksPx[iB];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 6;
  ctx.fillStyle = "white";
  for (const p of landmarksPx) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawHandSkeletonsOverBoard(handsLandmarks, box) {
  if (!box || !handsLandmarks || handsLandmarks.length === 0) return;

  for (const lm of handsLandmarks) {
    const landmarksPx = lm.map((pt) => toPixel(mirrorLandmarkX(pt)));
    const overBoard = landmarksPx.some((p) => isPointInBoard(p.x, p.y, box));
    if (overBoard) {
      drawHandSkeleton(landmarksPx);
    }
  }
}

export function drawBoardAndPieces() {
  const box = state.puzzle.boardBox;

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(245,197,24,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < state.GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(box.x + i * state.puzzle.tileW, box.y);
    ctx.lineTo(box.x + i * state.puzzle.tileW, box.y + box.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + i * state.puzzle.tileH);
    ctx.lineTo(box.x + box.width, box.y + i * state.puzzle.tileH);
    ctx.stroke();
  }
  ctx.restore();

  const sorted = [...state.puzzle.pieces].sort((a, b) => (a.dragging ? 1 : 0) - (b.dragging ? 1 : 0));

  for (const piece of sorted) {
    ctx.save();
    if (piece.dragging) {
      ctx.shadowColor = "rgba(245,197,24,0.9)";
      ctx.shadowBlur = 14;
    }
    ctx.drawImage(piece.canvas, piece.x, piece.y, piece.w, piece.h);
    ctx.strokeStyle = piece.placed ? "#5fae6e" : "rgba(234,229,214,0.5)";
    ctx.lineWidth = piece.dragging ? 3 : 1.5;
    ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = state.puzzle.solved ? "#5fae6e" : "#f5c518";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  if (state.puzzle.solved) {
    ctx.save();
    ctx.fillStyle = "rgba(95,174,110,0.15)";
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.font = `${Math.max(20, box.width * 0.07)}px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = "#5fae6e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("COMPLETE! — fist to save", box.x + box.width / 2, box.y + box.height / 2);
    ctx.restore();
  }
}

export function updateProgressBadge() {
  if (state.appState !== "puzzle") {
    progressBadge.classList.remove("visible", "solved");
    return;
  }
  const placedCount = state.puzzle.pieces.filter((p) => p.placed).length;
  state.puzzleStats.elapsedLabel = formatElapsed(performance.now() - state.puzzleStats.startedAt);
  progressText.textContent = `${placedCount} / ${state.puzzle.pieces.length} pieces · ${state.puzzleStats.moveCount} moves · ${state.puzzleStats.elapsedLabel}`;
  progressBadge.classList.add("visible");
  progressBadge.classList.toggle("solved", state.puzzle.solved);
}
