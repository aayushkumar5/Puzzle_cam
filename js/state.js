import { DEFAULT_STRIP_MAX_PHOTOS, DEFAULT_GRID, DEFAULT_FILTER } from "./constants.js";

// One shared mutable object. Every module imports `state` and reads/writes
// its properties directly — this avoids needing getter/setter boilerplate
// for values that many modules need to share (appState, puzzle, etc.)
export const state = {
  appState: "tracking", // "tracking" | "countdown" | "puzzle" | "shattering"
  GRID: DEFAULT_GRID,
  currentFilter: DEFAULT_FILTER,

  handLandmarker: null,
  fistHoldCounter: 0,

  puzzle: {
    boardBox: null,
    pieces: [],
    solved: false,
    tileW: 0,
    tileH: 0,
    fullPhotoboothCanvas: null,
  },

  puzzleStats: {
    startedAt: 0,
    moveCount: 0,
    elapsedLabel: "0:00",
  },

  undoStack: [],

  drag: {
    activeHand: null,
    piece: null,
    offsetX: 0,
    offsetY: 0,
  },

  shatter: {
    active: false,
    startedAt: 0,
    fragments: [],
    pendingCanvas: null,
  },

  freezeGate: { holding: false, since: 0 },
  lastSeenFrame: { box: null, at: 0 },
  countdown: { active: false, startedAt: 0 },

  STRIP_MAX_PHOTOS: DEFAULT_STRIP_MAX_PHOTOS,
  galleryEntries: [],

  sfx: {
    enabled: true,
    ctx: null,
  },
};
