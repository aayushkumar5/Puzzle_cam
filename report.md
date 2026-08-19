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
- The `app.js` ES module entry point.

### `app.js`

The main application file. It currently contains nearly all application logic:

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

- A pinch is detected by comparing thumb-tip and index-tip distance.
- A fist is detected by comparing fingertip and wrist/MCP distances.
- The frame rectangle is calculated from the two index fingers.
- Puzzle shuffling, movement, snapping, completion, and gallery behavior are not machine learning.

The project does not train a model. It only performs inference using a pretrained MediaPipe model.

## 5. Current Controls

- Two-hand pinch: define the capture frame.
- Hold both pinches: start the capture countdown.
- Hand pinch over a piece: drag a puzzle piece.
- Mouse or touch pointer: drag a puzzle piece.
- Number keys `1` to `9`: select a puzzle piece.
- Arrow keys: move the selected piece.
- `Enter` or Space: snap the selected piece into its correct cell.
- Closed fist: save a solved puzzle or reset an unfinished puzzle.
- Download button: download the photo strip.
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
   - `main.js`

2. **Add automated tests**

   Test the pure logic independently:

   - Pinch classification.
   - Fist classification.
   - Puzzle shuffling.
   - Piece snapping.
   - Collision displacement.
   - Puzzle completion.
   - Photo-strip dimensions.

3. **Improve performance**

   `detectForVideo()` runs on the main thread. Image processing also uses expensive canvas pixel operations. Possible improvements:

   - Run detection in a Web Worker.
   - Detect hands at a lower frequency than rendering.
   - Avoid applying the photobooth effect to every live frame.
   - Reuse temporary canvases instead of repeatedly creating them.
   - Use `requestVideoFrameCallback()` where supported.

4. **Improve gesture stability**

   The pinch threshold is fixed at `0.055`. Detection could be more reliable with:

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
