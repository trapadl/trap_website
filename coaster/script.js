/* =============================================================================
   Coaster — trap. art submission platform
   script.js

   Architecture constraints:
   - Vanilla JS (ES2020+), no build toolchain, no npm
   - Supabase JS loaded via CDN (global window.supabase)
   - All Supabase calls in named async functions (never inline in event handlers)
   - goToStep() is the ONLY screen transition function
   - state object is the ONLY cross-function state (no other globals)
   - No service role key here — anon key only; RLS enforces access control
   ============================================================================= */

// =============================================================================
// SUPABASE CLIENT INITIALISATION
// Both are safe to expose in client-side code — RLS policies are the access control layer.
// NOTE: variable named 'db' not 'supabase' — the CDN declares window.supabase globally,
// so using 'supabase' as a variable name causes "already declared" error in browsers.
// =============================================================================

const SUPABASE_URL = 'https://snmwmyladvuevtatefeo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubXdteWxhZHZ1ZXZ0YXRlZmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDc1NTQsImV4cCI6MjA4OTYyMzU1NH0.06TfZiiiupLZovfZNlZCS0Vc2NsEss9tZhU0lswI3ro';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================================================
// MODULE-SCOPED STATE
// Single state object tracks all submission progress.
// Resets on page load — no persistence across refreshes (by design).
// =============================================================================

const state = {
  rawImagePath: null,       // Storage path: {submissionId}/original.jpg
  processedImageUrl: null,  // Public CDN URL of processed image
  submissionId: null,       // UUID of pending submissions record
  userEmail: null,          // Stored for OTP verify call
  shareId: null,            // UUID from ?id= param; used by Story 3.4
  pendingRawBlob: null,     // Raw image blob waiting to be uploaded in startProcessing
};

// =============================================================================
// STEP SYSTEM
// All submission flow steps; goToStep() is the only screen transition function.
// =============================================================================

const STEPS = ['landing', 'camera', 'processing', 'reveal', 'form', 'otp', 'confirmation'];

let currentStep = null;

/**
 * Transition to the named step. Hides all other steps.
 * This is the ONLY function permitted to show/hide step screens.
 * @param {string} stepName - One of STEPS array values
 */
function goToStep(stepName) {
  // Reset camera UI when returning to camera step (retake flow)
  if (stepName === 'camera') {
    document.querySelector('.camera-trigger')?.classList.remove('is-hidden');
    document.querySelector('.camera-viewfinder')?.classList.add('is-hidden');
    document.querySelector('.camera-error')?.classList.add('is-hidden');
    document.querySelector('.site-header')?.classList.remove('is-hidden');
    state.rawImagePath = null;
    state.submissionId = null;
    state.processedImageUrl = null;
    state.pendingRawBlob = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
  }
  document.querySelectorAll('.step').forEach(el => el.classList.remove('step--active'));
  const target = document.querySelector(`.step--${stepName}`);
  if (target) {
    target.classList.add('step--active');
    currentStep = stepName;
  } else {
    console.error(`[goToStep] Step not found: ${stepName}`);
  }
  if (stepName === 'processing') {
    startProcessing();
  }
  if (stepName === 'reveal') {
    initRevealStep();
  }
}

// =============================================================================
// STORAGE PATH HELPERS
// Always derive image paths from submission UUID — never construct ad-hoc.
// =============================================================================

const RAW_PATH = (id) => `${id}/original.jpg`;
const PROCESSED_PATH = (id) => `${id}/processed.webp`;
const PROCESSED_URL = (id) =>
  `${SUPABASE_URL}/storage/v1/object/public/processed-images/${PROCESSED_PATH(id)}`;

// =============================================================================
// VOTE COOKIE HELPERS
// Cookie name: coaster_voted
// Value: JSON array of voted submission IDs
// Expiry: 24 hours per vote
// =============================================================================

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function hasVoted(submissionId) {
  const cookie = getCookie('coaster_voted');
  const voted = cookie ? JSON.parse(cookie) : [];
  return voted.includes(submissionId);
}

function recordVote(submissionId) {
  const cookie = getCookie('coaster_voted');
  const voted = cookie ? JSON.parse(cookie) : [];
  if (!voted.includes(submissionId)) {
    voted.push(submissionId);
    setCookie('coaster_voted', JSON.stringify(voted), 1); // 1 day expiry
  }
}

// =============================================================================
// OPENCV — Lazy-loaded for coaster circle detection
// Loaded in background when camera opens; detectCoaster() times out after 5s
// and falls back to centre-crop if OpenCV isn't ready or finds no circle.
// CDN: @techstark/opencv-js (maintained jsDelivr build of OpenCV 4.10)
// =============================================================================

let cvLoadPromise = null;

function ensureOpenCV() {
  if (cvLoadPromise) return cvLoadPromise;
  cvLoadPromise = new Promise((resolve, reject) => {
    if (window.cv?.Mat) { resolve(window.cv); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js';
    script.async = true;
    script.onerror = () => reject(new Error('opencv_load_failed'));
    script.onload = () => {
      if (window.cv?.Mat) { resolve(window.cv); return; }
      window.cv.onRuntimeInitialized = () => resolve(window.cv);
    };
    document.head.appendChild(script);
  });
  return cvLoadPromise;
}

// Detect the largest circle in the frame and return a canvas cropped to it.
// Falls back to original canvas if no circle found or OpenCV times out.
async function detectCoaster(canvas) {
  let cv;
  try {
    cv = await Promise.race([
      ensureOpenCV(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('opencv_timeout')), 5000)),
    ]);
  } catch (e) {
    console.warn('[detectCoaster] skipped:', e.message);
    return canvas;
  }

  let src, gray, circles;
  try {
    src = cv.imread(canvas);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2, 2);

    circles = new cv.Mat();
    const short = Math.min(gray.rows, gray.cols);
    cv.HoughCircles(
      gray, circles, cv.HOUGH_GRADIENT,
      1,            // dp
      short / 4,    // minDist between circle centres
      120,          // param1: Canny upper threshold
      35,           // param2: accumulator threshold (lower = more detections)
      short * 0.20, // minRadius: coaster must be ≥20% of short side
      short * 0.55, // maxRadius: coaster ≤55% of short side
    );

    if (circles.cols === 0) {
      console.log('[detectCoaster] no circle found — using centre crop');
      return canvas;
    }

    const cx = circles.data32F[0];
    const cy = circles.data32F[1];
    const r  = circles.data32F[2];
    console.log(`[detectCoaster] circle at (${Math.round(cx)}, ${Math.round(cy)}) r=${Math.round(r)}`);

    // Crop to detected circle with 6% padding, preserving full resolution
    const pad  = r * 0.06;
    const side = (r + pad) * 2;
    const sx   = cx - r - pad;
    const sy   = cy - r - pad;

    const out = document.createElement('canvas');
    out.width  = Math.round(side);
    out.height = Math.round(side);
    out.getContext('2d').drawImage(canvas, sx, sy, side, side, 0, 0, out.width, out.height);
    return out;

  } catch (e) {
    console.warn('[detectCoaster] processing error — using original:', e);
    return canvas;
  } finally {
    src?.delete();
    gray?.delete();
    circles?.delete();
  }
}

// =============================================================================
// CAMERA
// =============================================================================

let cameraStream = null;

async function startCamera() {
  ensureOpenCV(); // start loading in background while user looks at viewfinder
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    const video = document.getElementById('camera-video');
    video.srcObject = cameraStream;
    document.querySelector('.camera-trigger').classList.add('is-hidden');
    document.querySelector('.camera-viewfinder').classList.remove('is-hidden');
    document.querySelector('.site-header').classList.add('is-hidden');
  } catch (err) {
    console.error('[startCamera]', err.message);
    document.querySelector('.camera-trigger').classList.add('is-hidden');
    document.querySelector('.camera-error').classList.remove('is-hidden');
  }
}

async function captureFrame() {
  const video = document.getElementById('camera-video');
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = video.videoWidth;
  rawCanvas.height = video.videoHeight;
  rawCanvas.getContext('2d').drawImage(video, 0, 0);

  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }

  // Detect coaster circle and crop to it; falls back to original if not found
  const detected = await detectCoaster(rawCanvas);

  detected.toBlob(rawBlob => {
    state.pendingRawBlob = rawBlob;
    goToStep('processing');
  }, 'image/jpeg', 0.92);
}

function showCameraError(msg) {
  document.querySelector('.camera-error__msg').textContent = msg;
  document.querySelector('.camera-viewfinder').classList.add('is-hidden');
  document.querySelector('.camera-trigger').classList.add('is-hidden');
  document.querySelector('.camera-error').classList.remove('is-hidden');
  document.querySelector('.site-header').classList.remove('is-hidden');
}

// =============================================================================
// PROCESSING
// =============================================================================

// Called automatically on step entry via goToStep('processing').
// Uploads raw image, creates submission record, then calls the edge function
// to process server-side. On success shows reveal animation.
async function startProcessing() {
  document.querySelector('.processing-body').classList.remove('is-hidden');
  document.querySelector('.processing-reveal').classList.add('is-hidden');
  document.querySelector('.processing-reveal').classList.remove('processing-reveal--animating');
  document.querySelector('.processing-error').classList.add('is-hidden');

  // 1. Upload raw image to private bucket
  const id = crypto.randomUUID();
  const rawPath = RAW_PATH(id);

  const { error: rawError } = await db.storage
    .from('raw-uploads')
    .upload(rawPath, state.pendingRawBlob, { contentType: 'image/jpeg' });

  if (rawError) {
    console.error('[startProcessing] upload', rawError);
    showProcessingError();
    return;
  }

  // 2. Create submission record
  const { error: insertError } = await db
    .from('submissions')
    .insert({ id, raw_image_path: rawPath, is_verified: false, name: '', email: '' });

  if (insertError) {
    console.error('[startProcessing] insert', insertError);
    showProcessingError();
    return;
  }

  state.submissionId = id;
  state.rawImagePath = rawPath;

  // 3. Call edge function — processes image server-side and returns CDN URL
  const { data, error } = await db.functions.invoke('process-image', {
    body: { rawImagePath: state.rawImagePath, submissionId: state.submissionId },
  });

  if (error || !data?.success) {
    console.error('[startProcessing]', error || data?.error);
    showProcessingError();
    return;
  }

  state.processedImageUrl = data.data.processedImageUrl;

  // 4. Reveal animation before transitioning to reveal step
  document.getElementById('processing-reveal-img').src = state.processedImageUrl;
  document.querySelector('.processing-body').classList.add('is-hidden');
  const revealEl = document.querySelector('.processing-reveal');
  revealEl.classList.remove('is-hidden');
  revealEl.classList.add('processing-reveal--animating');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => goToStep('reveal'), reducedMotion ? 0 : 600);
}

function showProcessingError() {
  document.querySelector('.processing-body').classList.add('is-hidden');
  document.querySelector('.processing-reveal').classList.add('is-hidden');
  document.querySelector('.processing-error').classList.remove('is-hidden');
}

// =============================================================================
// REVEAL STEP
// =============================================================================

function initRevealStep() {
  // Populate images with processed URL
  document.getElementById('reveal-thumb-img').src = state.processedImageUrl;
  document.getElementById('reveal-full-img').src = state.processedImageUrl;
  // Reset checkbox and button state
  const checkbox = document.getElementById('reveal-checkbox');
  const confirmBtn = document.getElementById('reveal-confirm-btn');
  checkbox.checked = false;
  confirmBtn.disabled = true;
  // Hide lightbox
  document.getElementById('reveal-lightbox').classList.add('is-hidden');
}

// =============================================================================
// URL ROUTING — Reads params on DOMContentLoaded and routes to correct mode
// /coaster/             → feed mode (5 sections, no submission UI)
// /coaster/?mode=submit → submission mode (camera → form → OTP → share)
// /coaster/?id={uuid}   → share-link landing (featured coaster + feed)
// =============================================================================

function initSubmissionMode() {
  goToStep('landing');
}

function initFeedMode() {
  document.getElementById('feed-view').hidden = false;
}

function initShareLinkMode(shareId) {
  state.shareId = shareId;
  document.getElementById('feed-view').hidden = false;
}

// =============================================================================
// DOM READY — Route to correct mode based on URL params
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Coaster] Supabase client initialised');

  // Event listeners
  document.querySelector('[data-action="submit-cta"]')
    ?.addEventListener('click', () => goToStep('camera'));

  document.querySelector('[data-action="open-camera"]')
    ?.addEventListener('click', startCamera);

  document.querySelector('[data-action="capture"]')
    ?.addEventListener('click', captureFrame);

  document.getElementById('camera-fallback')
    ?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const detected = await detectCoaster(canvas);
        detected.toBlob(rawBlob => {
          state.pendingRawBlob = rawBlob;
          goToStep('processing');
        }, 'image/jpeg', 0.92);
      };
      img.src = url;
    });

  document.querySelector('[data-action="processing-retake"]')
    ?.addEventListener('click', () => goToStep('camera'));

  // Reveal step
  document.querySelector('[data-action="reveal-enlarge"]')
    ?.addEventListener('click', () => {
      document.getElementById('reveal-lightbox').classList.remove('is-hidden');
    });

  document.getElementById('reveal-lightbox')
    ?.addEventListener('click', () => {
      document.getElementById('reveal-lightbox').classList.add('is-hidden');
    });

  document.getElementById('reveal-checkbox')
    ?.addEventListener('change', (e) => {
      document.getElementById('reveal-confirm-btn').disabled = !e.target.checked;
    });

  document.querySelector('[data-action="reveal-confirm"]')
    ?.addEventListener('click', () => goToStep('form'));

  document.querySelector('[data-action="reveal-retake"]')
    ?.addEventListener('click', () => goToStep('camera'));

  // URL routing
  const params = new URLSearchParams(window.location.search);
  const shareId = params.get('id');
  const mode = params.get('mode');

  if (shareId) {
    initShareLinkMode(shareId);
  } else if (mode === 'submit') {
    initSubmissionMode();
  } else {
    initFeedMode();
  }
});
