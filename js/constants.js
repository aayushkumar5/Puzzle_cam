// Hand landmark indices used by MediaPipe HandLandmarker
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  MIDDLE_MCP: 9,
  RING_MCP: 13,
  PINKY_MCP: 17,
};

export const PINCH_THRESHOLD = 0.055;
export const FRAME_PADDING = 28;
export const FREEZE_HOLD_MS = 250;
export const COUNTDOWN_SECONDS = 3;
export const FIST_HOLD_FRAMES = 12;
export const SNAP_DISTANCE_RATIO = 0.45;
export const LOAD_TIMEOUT_MS = 20000;

export const PHOTOBOOTH_CONTRAST_ALPHA = 1.3;
export const PHOTOBOOTH_BRIGHTNESS_BETA = 10;
export const PHOTOBOOTH_NOISE_STD = 15;

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const SHATTER_COLS = 6;
export const SHATTER_ROWS = 6;
export const SHATTER_DURATION_MS = 850;

export const DEFAULT_STRIP_MAX_PHOTOS = 3;
export const STRIP_FILE_BORDER = 24;
export const STRIP_FILE_GAP = 16;
export const STRIP_FILE_BG = "#ffffff";

export const FRAME_GRACE_MS = 450;
export const DISPLACE_ANIM_MS = 220;
export const UNDO_STACK_LIMIT = 30;

export const STORAGE_KEY = "puzzlecam_gallery_v1";
export const ONBOARDING_KEY = "puzzlecam_onboarding_seen_v1";

export const DEFAULT_GRID = 3;
export const DEFAULT_FILTER = "bw";
