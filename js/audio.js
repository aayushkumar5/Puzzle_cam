import { state } from "./state.js";
import { soundToggleBtn } from "./dom.js";

function getAudioCtx() {
  if (!state.sfx.ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    state.sfx.ctx = new Ctor();
  }
  if (state.sfx.ctx.state === "suspended") {
    state.sfx.ctx.resume().catch(() => {});
  }
  return state.sfx.ctx;
}

function playTone({ freq = 440, duration = 0.12, type = "sine", gain = 0.08, glideTo = null }) {
  if (!state.sfx.enabled) return;
  const audioCtx = getAudioCtx();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, audioCtx.currentTime + duration);
  }
  gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export const playShutterSound = () =>
  playTone({ freq: 900, duration: 0.09, type: "square", gain: 0.07, glideTo: 220 });

export const playSnapSound = () =>
  playTone({ freq: 660, duration: 0.07, type: "triangle", gain: 0.06 });

export const playSolveSound = () => {
  playTone({ freq: 523.25, duration: 0.14, type: "sine", gain: 0.07 });
  setTimeout(() => playTone({ freq: 659.25, duration: 0.14, type: "sine", gain: 0.07 }), 90);
  setTimeout(() => playTone({ freq: 783.99, duration: 0.22, type: "sine", gain: 0.08 }), 180);
};

export const playSaveSound = () =>
  playTone({ freq: 300, duration: 0.18, type: "sine", gain: 0.06, glideTo: 500 });

export function initAudioControls() {
  if (!soundToggleBtn) return;
  soundToggleBtn.addEventListener("click", () => {
    state.sfx.enabled = !state.sfx.enabled;
    soundToggleBtn.setAttribute("aria-pressed", String(state.sfx.enabled));
    soundToggleBtn.textContent = state.sfx.enabled ? "🔊" : "🔇";
    soundToggleBtn.title = state.sfx.enabled ? "mute sounds" : "enable sounds";
    if (state.sfx.enabled) getAudioCtx();
  });
}
