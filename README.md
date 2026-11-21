# TX RATE V3

This is an offline-first, mobile-friendly face-photo analysis web app. It uses MediaPipe Face Landmarker locally and detects 478 landmarks. It also measures photo conditions (lighting, contrast, sharpness proxy, crop, centering and face size), highlights the strongest/weakest photo aspects, and offers practical retake suggestions.

It deliberately does not assign attractiveness scores, PSL scores, or Sub3/LTN/MTN/HTN/Chad tiers. Those labels are not scientifically validated, and ranking a young person's natural features can be harmful. The dashboard instead focuses on controllable image quality and styling.

## Termux setup
One-time internet is needed to download packages and the model:
```bash
pkg update && pkg upgrade
pkg install nodejs-lts
cd ~/storage/downloads/TX_RATE_V3
npm install
mkdir -p public/wasm public/models
cp -r node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/
curl -L "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task" -o public/models/face_landmarker.task
```
Check:
```bash
ls -lh public/models/face_landmarker.task
ls public/wasm
```
Run:
```bash
npm run dev -- --host 0.0.0.0
```
Open the local URL Vite prints, usually `http://127.0.0.1:5173`.

After the model and WASM files are downloaded, the analysis runs locally. Keep the local server running.

## APK
This is not yet a compiled APK. Package on a computer with Android Studio/SDK using Capacitor:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "TX RATE" "app.txrate.mobile" --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
Ensure the model and WASM assets are copied into `dist` by Vite before building.
