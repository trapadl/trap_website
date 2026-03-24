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
  userName: null,           // Stored on form submit; passed to verify-submission in Story 2.5
  userInstagram: null,      // Stored on form submit; WITHOUT @ prefix
  checkEmailVerified: null, // bool from check-email response; true = fast-path (Story 2.6)
  otpAttempts: 0,           // wrong OTP attempt counter; reset on initOtpStep and resend
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
    state.userEmail = null;
    state.userName = null;
    state.userInstagram = null;
    state.checkEmailVerified = null;
    state.otpAttempts = 0;
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
  if (stepName === 'otp') {
    initOtpStep();
  }
  if (stepName === 'confirmation') {
    initConfirmationStep();
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

function captureFrame() {
  const video = document.getElementById('camera-video');
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = video.videoWidth;
  rawCanvas.height = video.videoHeight;
  rawCanvas.getContext('2d').drawImage(video, 0, 0);

  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }

  rawCanvas.toBlob(rawBlob => {
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
// FORM STEP (Story 2.4)
// =============================================================================

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm() {
  let valid = true;

  const nameVal = document.getElementById('form-name').value.trim();
  const nameError = document.getElementById('form-name-error');
  const nameInput = document.getElementById('form-name');
  if (!nameVal) {
    nameError.classList.remove('is-hidden');
    nameInput.classList.add('form-input--error');
    valid = false;
  } else {
    nameError.classList.add('is-hidden');
    nameInput.classList.remove('form-input--error');
  }

  const emailVal = document.getElementById('form-email').value.trim();
  const emailError = document.getElementById('form-email-error');
  const emailInput = document.getElementById('form-email');
  if (!emailVal || !validateEmail(emailVal)) {
    emailError.classList.remove('is-hidden');
    emailInput.classList.add('form-input--error');
    valid = false;
  } else {
    emailError.classList.add('is-hidden');
    emailInput.classList.remove('form-input--error');
  }

  return valid;
}

async function onSubmitForm() {
  if (!validateForm()) return;

  if (!state.rawImagePath) {
    const submitError = document.getElementById('form-submit-error');
    submitError.textContent = 'Please take a photo first.';
    submitError.classList.remove('is-hidden');
    return;
  }

  const btn = document.getElementById('form-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  btn.style.opacity = '0.6';
  document.getElementById('form-submit-error').classList.add('is-hidden');

  state.userName = document.getElementById('form-name').value.trim();
  state.userEmail = document.getElementById('form-email').value.trim();
  state.userInstagram = document.getElementById('form-instagram').value.trim();

  const { data, error } = await db.functions.invoke('check-email', {
    body: { email: state.userEmail },
  });

  if (error || !data?.success) {
    console.error('[onSubmitForm] check-email', error || data);
    btn.disabled = false;
    btn.textContent = 'Submit';
    btn.style.opacity = '';
    document.getElementById('form-submit-error').classList.remove('is-hidden');
    return;
  }

  state.checkEmailVerified = data.data.verified;

  if (!data.data.verified) {
    // New user — send OTP before showing OTP step
    const { error: otpError } = await db.auth.signInWithOtp({ email: state.userEmail });
    if (otpError) {
      console.error('[onSubmitForm] signInWithOtp', otpError);
      btn.disabled = false;
      btn.textContent = 'Submit';
      btn.style.opacity = '';
      document.getElementById('form-submit-error').classList.remove('is-hidden');
      return;
    }
  }
  // verified=true: Story 2.6 will add fast-path bypass here
  goToStep('otp');
}

function updateCharCounter(inputEl, counterEl, limit) {
  const remaining = limit - inputEl.value.length;
  if (remaining <= 10) {
    counterEl.textContent = `${remaining} characters remaining`;
    counterEl.classList.remove('is-hidden');
  } else {
    counterEl.classList.add('is-hidden');
  }
}

// =============================================================================
// OTP STEP (Story 2.5)
// =============================================================================

function initOtpStep() {
  document.getElementById('otp-email-label').textContent =
    `We've sent a 6-digit code to ${state.userEmail}.`;

  const input = document.getElementById('otp-input');
  input.value = '';
  input.classList.remove('otp-input--error');
  input.disabled = false;

  document.getElementById('otp-error').textContent = 'Incorrect code — try again.';
  document.getElementById('otp-error').classList.add('is-hidden');
  document.getElementById('otp-resend').classList.add('is-hidden');
  document.getElementById('otp-resend-confirm').classList.add('is-hidden');
  state.otpAttempts = 0;

  // Delayed focus — immediate focus can be swallowed by iOS Safari during step transition
  setTimeout(() => input.focus(), 300);
}

async function onOtpComplete(code) {
  const input = document.getElementById('otp-input');
  input.disabled = true; // prevent double-submit while verifying

  const { error } = await db.auth.verifyOtp({
    email: state.userEmail,
    token: code,
    type: 'email',
  });

  input.disabled = false;

  if (error) {
    input.value = '';
    input.classList.add('otp-input--error');

    const expired = error.message && error.message.toLowerCase().includes('expired');
    if (expired) {
      document.getElementById('otp-error').textContent = 'Your code has expired — request a new one.';
      document.getElementById('otp-resend').classList.remove('is-hidden');
    } else {
      state.otpAttempts += 1;
      document.getElementById('otp-error').textContent = 'Incorrect code — try again.';
      if (state.otpAttempts >= 3) {
        document.getElementById('otp-resend').classList.remove('is-hidden');
      }
    }

    document.getElementById('otp-error').classList.remove('is-hidden');
    setTimeout(() => input.focus(), 50);
    return;
  }

  await callVerifySubmission();
}

async function callVerifySubmission() {
  const { data, error } = await db.functions.invoke('verify-submission', {
    body: {
      submissionId: state.submissionId,
      email: state.userEmail,
      name: state.userName,
      instagram: state.userInstagram || null,
    },
  });

  if (error || !data?.success) {
    console.error('[callVerifySubmission]', error || data);
    const errEl = document.getElementById('otp-error');
    if (errEl) {
      errEl.textContent = 'Something went wrong. Please try again.';
      errEl.classList.remove('is-hidden');
    }
    return;
  }

  goToStep('confirmation');
}

async function resendOtp() {
  const { error } = await db.auth.signInWithOtp({ email: state.userEmail });
  if (error) {
    console.error('[resendOtp]', error);
    return;
  }

  state.otpAttempts = 0;
  const input = document.getElementById('otp-input');
  input.value = '';
  input.classList.remove('otp-input--error');
  document.getElementById('otp-error').classList.add('is-hidden');
  document.getElementById('otp-resend').classList.add('is-hidden');

  const confirm = document.getElementById('otp-resend-confirm');
  confirm.classList.remove('is-hidden');
  setTimeout(() => confirm.classList.add('is-hidden'), 2000);
  setTimeout(() => input.focus(), 50);
}

// =============================================================================
// CONFIRMATION STEP (Story 2.5)
// =============================================================================

function initConfirmationStep() {
  document.getElementById('confirmation-img').src = state.processedImageUrl;

  const shareUrl = `https://trapadl.com/coaster/?id=${state.submissionId}`;
  document.getElementById('confirmation-url').textContent = shareUrl;

  // Show "Submitted!" toast for 2s then auto-hide
  const toast = document.getElementById('confirmation-toast');
  toast.classList.remove('is-hidden');
  setTimeout(() => toast.classList.add('is-hidden'), 2000);
}

function onShareInstagram() {
  const shareUrl = `https://trapadl.com/coaster/?id=${state.submissionId}`;
  const shareData = { url: shareUrl, text: 'Check out my coaster — vote for it!' };

  if (navigator.share) {
    navigator.share(shareData).catch(err => {
      if (err.name !== 'AbortError') {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
    });
  } else {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  }
}

function onCopyLink() {
  const shareUrl = `https://trapadl.com/coaster/?id=${state.submissionId}`;
  const btn = document.getElementById('copy-link-btn');
  navigator.clipboard.writeText(shareUrl).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy link'; }, 2000);
  }).catch(err => {
    console.error('[onCopyLink]', err);
  });
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
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(rawBlob => {
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

  // Form step
  document.querySelector('[data-action="submit-form"]')
    ?.addEventListener('click', onSubmitForm);

  document.getElementById('form-name')
    ?.addEventListener('blur', () => {
      const val = document.getElementById('form-name').value.trim();
      const nameError = document.getElementById('form-name-error');
      const nameInput = document.getElementById('form-name');
      if (!val) {
        nameError.classList.remove('is-hidden');
        nameInput.classList.add('form-input--error');
      } else {
        nameError.classList.add('is-hidden');
        nameInput.classList.remove('form-input--error');
      }
    });

  document.getElementById('form-email')
    ?.addEventListener('blur', () => {
      const val = document.getElementById('form-email').value.trim();
      const emailError = document.getElementById('form-email-error');
      const emailInput = document.getElementById('form-email');
      if (val && !validateEmail(val)) {
        emailError.classList.remove('is-hidden');
        emailInput.classList.add('form-input--error');
      } else {
        emailError.classList.add('is-hidden');
        emailInput.classList.remove('form-input--error');
      }
    });

  document.getElementById('form-name')
    ?.addEventListener('input', () => {
      updateCharCounter(
        document.getElementById('form-name'),
        document.getElementById('form-name-counter'),
        60
      );
    });

  document.getElementById('form-instagram')
    ?.addEventListener('input', () => {
      updateCharCounter(
        document.getElementById('form-instagram'),
        document.getElementById('form-instagram-counter'),
        30
      );
    });

  // OTP step
  document.getElementById('otp-input')
    ?.addEventListener('input', (e) => {
      if (e.target.value.length === 8) onOtpComplete(e.target.value);
    });

  document.querySelector('[data-action="otp-resend"]')
    ?.addEventListener('click', resendOtp);

  // Confirmation step
  document.querySelector('[data-action="share-instagram"]')
    ?.addEventListener('click', onShareInstagram);

  document.querySelector('[data-action="copy-link"]')
    ?.addEventListener('click', onCopyLink);

  document.querySelector('[data-action="see-feed"]')
    ?.addEventListener('click', initFeedMode);

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
