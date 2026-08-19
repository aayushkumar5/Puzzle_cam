export const videoEl = document.getElementById("webcam");
export const canvas = document.getElementById("sceneCanvas");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });

export const stageEl = document.getElementById("stage");

export const statusDot = document.getElementById("statusDot");
export const statusText = document.getElementById("statusText");
export const loadingOverlay = document.getElementById("loadingOverlay");
export const loaderText = document.getElementById("loaderText");
export const loaderRetry = document.getElementById("loaderRetry");
export const errorBanner = document.getElementById("errorBanner");
export const progressBadge = document.getElementById("progressBadge");
export const progressText = document.getElementById("progressText");

export const galleryStrip = document.getElementById("galleryStrip");
export const galleryEmpty = document.getElementById("galleryEmpty");
export const galleryCount = document.getElementById("galleryCount");
export const downloadStripBtn = document.getElementById("downloadStripBtn");
export const resetAllBtn = document.getElementById("resetAllBtn");
export const stripCompleteMsg = document.getElementById("stripCompleteMsg");
export const soundToggleBtn = document.getElementById("soundToggleBtn");
export const stripLengthSelect = document.getElementById("stripLengthSelect");
export const filterSelect = document.getElementById("filterSelect");
export const difficultySelect = document.getElementById("difficultySelect");
export const captureBtn = document.getElementById("captureBtn");
export const undoBtn = document.getElementById("undoBtn");
export const onboardingOverlay = document.getElementById("onboardingOverlay");
export const onboardingDismissBtn = document.getElementById("onboardingDismissBtn");
