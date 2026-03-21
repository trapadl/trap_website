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
// CAMERA
// =============================================================================

let cameraStream = null;

async function startCamera() {
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

// Build raw canvas (full-res) + processed canvas (800×800 circular crop) from any drawable source.
function buildCanvases(source, srcWidth, srcHeight) {
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = srcWidth;
  rawCanvas.height = srcHeight;
  rawCanvas.getContext('2d').drawImage(source, 0, 0);

  const size = Math.min(srcWidth, srcHeight);
  const sx = (srcWidth - size) / 2;
  const sy = (srcHeight - size) / 2;

  const processedCanvas = document.createElement('canvas');
  processedCanvas.width = 800;
  processedCanvas.height = 800;
  const pCtx = processedCanvas.getContext('2d');
  pCtx.beginPath();
  pCtx.arc(400, 400, 400, 0, Math.PI * 2);
  pCtx.closePath();
  pCtx.clip();
  pCtx.drawImage(source, sx, sy, size, size, 0, 0, 800, 800);

  return { rawCanvas, processedCanvas };
}

function captureFrame() {
  const video = document.getElementById('camera-video');
  const { rawCanvas, processedCanvas } = buildCanvases(video, video.videoWidth, video.videoHeight);

  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }

  goToStep('processing');

  rawCanvas.toBlob(rawBlob => {
    processedCanvas.toBlob(processedBlob => {
      uploadImages(rawBlob, processedBlob);
    }, 'image/jpeg', 0.85);
  }, 'image/jpeg', 0.92);
}

async function uploadImages(rawBlob, processedBlob) {
  const id = crypto.randomUUID();
  const rawPath = RAW_PATH(id);
  const processedPath = PROCESSED_PATH(id);

  const { error: rawError } = await db.storage
    .from('raw-uploads')
    .upload(rawPath, rawBlob, { contentType: 'image/jpeg' });

  if (rawError) {
    showProcessingError();
    console.error('[uploadImages] raw', rawError);
    return;
  }

  const { error: processedError } = await db.storage
    .from('processed-images')
    .upload(processedPath, processedBlob, { contentType: 'image/jpeg' });

  if (processedError) {
    showProcessingError();
    console.error('[uploadImages] processed', processedError);
    return;
  }

  const { error: insertError } = await db
    .from('submissions')
    .insert({ id, raw_image_path: rawPath, processed_image_path: processedPath, is_verified: false, name: '', email: '' });

  if (insertError) {
    showProcessingError();
    console.error('[uploadImages] insert', insertError);
    return;
  }

  state.submissionId = id;
  state.rawImagePath = rawPath;
  state.processedImageUrl = PROCESSED_URL(id);

  // Reveal animation before transitioning to reveal step
  document.getElementById('processing-reveal-img').src = state.processedImageUrl;
  document.querySelector('.processing-body').classList.add('is-hidden');
  const revealEl = document.querySelector('.processing-reveal');
  revealEl.classList.remove('is-hidden');
  revealEl.classList.add('processing-reveal--animating');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => goToStep('reveal'), reducedMotion ? 0 : 600);
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

// Resets processing UI to loading state — called on step entry and on retake.
function startProcessing() {
  document.querySelector('.processing-body').classList.remove('is-hidden');
  document.querySelector('.processing-reveal').classList.add('is-hidden');
  document.querySelector('.processing-reveal').classList.remove('processing-reveal--animating');
  document.querySelector('.processing-error').classList.add('is-hidden');
}

function showProcessingError() {
  document.querySelector('.processing-body').classList.add('is-hidden');
  document.querySelector('.processing-reveal').classList.add('is-hidden');
  document.querySelector('.processing-error').classList.remove('is-hidden');
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
    ?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { rawCanvas, processedCanvas } = buildCanvases(img, img.naturalWidth, img.naturalHeight);
        goToStep('processing');
        rawCanvas.toBlob(rawBlob => {
          processedCanvas.toBlob(processedBlob => {
            uploadImages(rawBlob, processedBlob);
          }, 'image/jpeg', 0.85);
        }, 'image/jpeg', 0.92);
      };
      img.src = url;
    });

  document.querySelector('[data-action="processing-retake"]')
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
