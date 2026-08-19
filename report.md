# PuzzleCam Project Report

## 1. Project Overview

PuzzleCam is a frontend-only browser game that uses a webcam and hand gestures. The user forms a frame with both hands, captures an image, and solves the captured image as a 3x3 puzzle. Completed puzzles are stored in a photo strip that can be downloaded as a PNG.

The project has no backend and no build step. External dependencies are loaded from CDNs at runtime.

## 2. Project Files

### `index.html`

The main HTML entry point. It defines:

- The webcam video element.
- The canvas used to render the application.
- The loading overlay and retry button.
- Status and progress indicators.
- The photo gallery.
- Download and reset buttons.
- The `js/main.js` ES module entry point.

### `js/main.js`

The application entry point. It coordinates webcam/model boot, the render loop, hand results, and initialization of the modular controls:

- Webcam initialization through `navigator.mediaDevices.getUserMedia()`.
- MediaPipe HandLandmarker loading.
- Hand landmark processing.
- Pinch and fist gesture detection.
- Hand-frame calculation.
- Countdown and image capture.
- Photobooth grayscale and noise effects.
- 3x3 puzzle creation and shuffling.
- Gesture, pointer, mouse, and keyboard puzzle controls.
- Piece snapping and collision/displacement behavior.
- Canvas rendering.
- Hand skeleton rendering.
- Puzzle completion detection.
- Shatter animation after completion.
- Gallery thumbnail rendering.
- Photo-strip generation and download.
- Camera visibility and page-exit cleanup.
- Application boot and error handling.

### `css/styles.css`

Contains the visual design and layout:

- Dark camera stage.
- Yellow/green/red status colors.
- Loading and error states.
- Canvas positioning.
- Puzzle progress badge.
- Photo gallery and print-style thumbnails.
- Gallery action buttons.
- Loading and shatter-related animations.
- Responsive layout for smaller screens.

### `README.md`

Contains setup instructions, supported browsers, gesture controls, project structure, troubleshooting guidance, and the fallback pointer/keyboard controls.

### `.gitignore`

Ignores operating-system files, VS Code settings, installed dependencies, and environment files.

## 3. Runtime Flow

1. `boot()` starts the application.
2. `initWebcam()` requests webcam permission and configures the video dimensions.
3. `initHandLandmarker()` loads the MediaPipe WASM runtime and pretrained hand model.
4. The app tries GPU inference first and falls back to CPU inference.
5. `renderLoop()` reads webcam frames and calls `detectForVideo()`.
6. `processResults()` interprets the detected hand landmarks.
7. Two pinching hands define the capture rectangle.
8. Holding both pinches starts a three-second countdown.
9. The selected image area is mirrored, cropped, and processed with a photobooth effect.
10. The image is divided into nine puzzle pieces and shuffled.
11. A pinching hand, pointer, mouse, or keyboard can move pieces.
12. Correctly positioned pieces snap into place.
13. When all pieces are correctly placed, a closed fist saves the puzzle.
14. A shatter animation plays and the image is added to the gallery.
15. Up to three gallery images can be combined and downloaded as a photo strip.

## 4. Machine Learning Usage

Yes, this project uses machine learning for hand tracking.

The relevant code imports `FilesetResolver` and `HandLandmarker` from MediaPipe Tasks Vision. The model is loaded from:

- jsDelivr for the MediaPipe runtime and WASM files.
- Google Cloud Storage for the pretrained `hand_landmarker.task` model.

The model detects up to two hands and returns 21 normalized landmark points for each hand.

### ML Responsibilities

The ML model is used for:

- Detecting whether hands are visible.
- Locating hand landmarks.
- Providing thumb, index, middle, ring, and pinky coordinates.
- Drawing the hand skeleton overlay.

### Non-ML Responsibilities

The application uses custom rule-based JavaScript for gesture interpretation:

- Reset button: clear the gallery and restart.

## 6. Improvements Already Added

- GPU-to-CPU fallback for MediaPipe model loading.
- Loading timeout and retry handling.
- Camera cleanup when leaving the page.
- Pause of hand inference while the browser tab is hidden.
- Responsive mobile layout with the gallery below the camera.
- Pointer and touch dragging fallback.
- Keyboard puzzle controls.
- Canvas accessibility label.
- README documentation for fallback controls.

## 7. Recommended Improvements

### High Priority

1. **Split `app.js` into modules**

   The file is very large and owns camera, ML, rendering, puzzle, gallery, and image-processing responsibilities. Suggested modules:

   - `camera.js`
   - `handTracking.js`
   - `gestures.js`
   - `puzzle.js`
   - `gallery.js`
   - `renderer.js`
   ### `js/main.js`

   The application entry point. It coordinates webcam/model boot, the render loop, hand results, and initialization of all controls.

   ### `js/handTracking.js`

   Owns webcam lifecycle, MediaPipe HandLandmarker loading, hand landmark conversion, pinch/fist detection, and capture-frame calculation.

   ### `js/puzzleEngine.js`

   Owns countdown capture, puzzle-piece creation, shuffling, dragging, snapping, keyboard/pointer controls, undo, and solved-state logic.

 The `js/main.js` ES module entry point.

   Owns canvas rendering for the mirrored video, capture overlay, puzzle board, progress indicator, hand skeleton, and pinch progress ring.

   ### `js/gallery.js`

   Owns gallery thumbnails, strip length, IndexedDB/local storage restoration, photo-strip download, and gallery reset controls.

   ### `js/filters.js`

   Owns the available image filters and photobooth image processing.

   ### `js/shatterEngine.js`

   Owns the completion shatter animation and the fist action used to save or reset a puzzle.

   ### `js/audio.js`

   Generates shutter, snap, solve, and save sounds with the Web Audio API and manages the sound toggle.

   ### `js/dom.js`

   Centralizes references to the HTML elements used by the JavaScript modules.

   ### `js/state.js`

   Contains shared application state for the current puzzle, camera, gestures, gallery, and UI settings.

   ### `js/constants.js`

   Contains thresholds, timing values, grid settings, storage keys, and rendering constants.

   ### `js/controls.js` and `js/uiState.js`

   Handle fallback capture/onboarding controls and small UI state updates such as capture and undo button availability.
   - Run detection in a Web Worker.
   - Detect hands at a lower frequency than rendering.
   - Avoid applying the photobooth effect to every live frame.
   - Reuse temporary canvases instead of repeatedly creating them.
   - Use `requestVideoFrameCallback()` where supported.
   ├── js/               # Modular application logic
   │   ├── main.js       # Application entry point
   │   ├── handTracking.js
   │   ├── puzzleEngine.js
   │   ├── renderer.js
   │   ├── gallery.js
   │   ├── filters.js
   │   ├── shatterEngine.js
   │   ├── audio.js
   │   ├── controls.js
   │   ├── uiState.js
   │   ├── dom.js
   │   ├── state.js
   │   └── constants.js
   ├── css/
   │   └── styles.css    # Styles and layout
   ├── report.md         # Project report
   └── .gitignore

   - Palm-size-relative thresholds.
   - Landmark smoothing.
   - Multi-frame gesture confirmation.
   - Hysteresis to avoid rapid pinch state changes.

### Medium Priority

5. **Persist the gallery**

   Gallery entries currently exist only in memory and disappear after refresh. IndexedDB would allow captured images to survive browser refreshes without putting large image data into `localStorage`.

6. **Improve camera lifecycle handling**

   Add clear handling for camera disconnection, permission changes, and stream failures while the application is running.

7. **Improve mobile controls**

   Add a visible capture button and normal touch-friendly controls for devices where hand tracking is unreliable.

8. **Improve accessibility**

   Add live status announcements, stronger focus states, larger touch targets, and a complete non-camera mode.

9. **Improve localization**

   The interface is mostly Spanish but includes some English branding and labels. Either fully localize the interface or add a language selector.

### Production Improvements

10. **Reduce external runtime dependencies**

    Consider hosting the MediaPipe runtime and model locally for better reliability and offline support.

11. **Add a Content Security Policy**

    Restrict script, model, and network sources before deploying publicly.

12. **Use HTTPS in deployment**

    Camera access requires a secure context outside localhost.

13. **Add model loading progress**

    The current loader shows an animation but not actual download progress.

## 8. Known Limitations

- A webcam is required for the normal experience.
- The MediaPipe runtime and model require an internet connection unless hosted locally.
- The app must run through HTTP or HTTPS rather than directly from a file.
- Hand gesture reliability depends on lighting, camera quality, and hand visibility.
- There is no automated test suite.
- Gallery data is lost when the page is refreshed.
- The main JavaScript file is tightly coupled to the HTML DOM.

## 9. Conclusion

PuzzleCam is a working browser-based gesture puzzle with a clear interactive flow. Its machine-learning component is limited to pretrained hand landmark detection; the game itself is controlled by deterministic JavaScript rules.

The most valuable next steps are modularizing `app.js`, adding tests, improving frame-processing performance, and persisting gallery images with IndexedDB.
