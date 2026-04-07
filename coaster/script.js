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
    document.getElementById('share-toast')?.classList.add('is-hidden');
    document.getElementById('voting-feed')?.classList.add('is-hidden');
    const feedView = document.getElementById('feed-view');
    if (feedView) feedView.hidden = true;
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
  const btnLabel = document.getElementById('form-submit-label');
  const btnSpinner = btn.querySelector('.btn-spinner');
  btn.disabled = true;
  btnLabel.textContent = 'Please wait...';
  btnSpinner.classList.remove('is-hidden');
  document.getElementById('form-submit-error').classList.add('is-hidden');

  state.userName = document.getElementById('form-name').value.trim();
  state.userEmail = document.getElementById('form-email').value.trim();
  state.userInstagram = document.getElementById('form-instagram').value.trim();

  let checkData = null;
  try {
    const { data: cd, error: ce } = await db.functions.invoke('check-email', {
      body: { email: state.userEmail },
    });
    if (!ce && cd?.success) checkData = cd;
    else console.warn('[onSubmitForm] check-email non-success, falling back to OTP', ce || cd);
  } catch (checkErr) {
    // Network error — fail open, use OTP path
    console.warn('[onSubmitForm] check-email threw, falling back to OTP', checkErr);
  }

  state.checkEmailVerified = checkData?.data?.verified ?? false;

  if (checkData?.data?.verified) {
    // Fast-path: returning user — skip OTP entirely
    await callVerifySubmission();
    return;
  }

  // New user (or check-email failed) — send OTP before showing OTP step
  const { error: otpError } = await db.auth.signInWithOtp({ email: state.userEmail });
  if (otpError) {
    console.error('[onSubmitForm] signInWithOtp', otpError);
    btn.disabled = false;
    btnLabel.textContent = 'Submit';
    btnSpinner.classList.add('is-hidden');
    document.getElementById('form-submit-error').classList.remove('is-hidden');
    return;
  }
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
    `We've sent an 8-digit code to ${state.userEmail}.`;

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
    if (currentStep === 'form') {
      // Fast-path context: restore form button
      const btn = document.getElementById('form-submit-btn');
      const btnLabel = document.getElementById('form-submit-label');
      const btnSpinner = btn?.querySelector('.btn-spinner');
      if (btn) btn.disabled = false;
      if (btnLabel) btnLabel.textContent = 'Submit';
      if (btnSpinner) btnSpinner.classList.add('is-hidden');
      document.getElementById('form-submit-error')?.classList.remove('is-hidden');
    } else {
      // OTP context: show OTP error
      const errEl = document.getElementById('otp-error');
      if (errEl) {
        errEl.textContent = 'Something went wrong. Please try again.';
        errEl.classList.remove('is-hidden');
      }
    }
    return;
  }

  showShareToast();
  initVotingFeed();
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
// FEED DATA LAYER (Stories 3.1 – 3.4)
// Helpers, section config, and rendering for the 5-section public feed.
// =============================================================================

/**
 * Shared vote handler — used by feed grid cards (3.3) and featured coaster (3.4).
 * Optimistic: cookie written + buttons disabled immediately.
 * DB insert is async and silently fails.
 * @param {string} submissionId
 * @param {number} voteValue — 1 or -1
 * @param {HTMLElement} upBtn
 * @param {HTMLElement} downBtn
 */
async function onVote(submissionId, voteValue, upBtn, downBtn) {
  recordVote(submissionId);
  upBtn.disabled = true;
  downBtn.disabled = true;
  if (voteValue === 1) upBtn.classList.add('vote-btn--voted');
  else downBtn.classList.add('vote-btn--voted');

  const { error } = await db.from('votes').insert({
    submission_id: submissionId,
    vote_value: voteValue,
  });
  if (error) console.warn('[onVote] insert failed', error);
}

/**
 * Returns the public CDN URL for a processed coaster image.
 * All feed rendering MUST use this — never build the path ad-hoc.
 * @param {string} submissionId - UUID of the submission
 * @returns {string} Full CDN URL
 */
function getProcessedImageUrl(submissionId) {
  return `${SUPABASE_URL}/storage/v1/object/public/processed-images/${submissionId}/processed.webp`;
}

const FEED_SECTIONS = [
  { id: 'feed-section-best-all-time', heading: 'best of all time',  query: 'best_all_time'  },
  { id: 'feed-section-best-month',    heading: 'best this month',   query: 'best_month'     },
  { id: 'feed-section-most-recent',   heading: 'most recent',       query: 'most_recent'    },
  { id: 'feed-section-random',        heading: 'random picks',      query: 'random'         },
  { id: 'feed-section-worst',         heading: 'worst of all time', query: 'worst_all_time' },
];

let feedLoaded = false;

/**
 * Creates a coaster thumbnail card DOM element.
 * @param {Object} row - Row from submission_scores view
 * @returns {HTMLElement}
 */
function createCoasterCard(row) {
  const card = document.createElement('div');
  card.className = 'coaster-card';
  card.dataset.submissionId = row.id;

  // Circle thumbnail with shimmer while loading
  const circleDiv = document.createElement('div');
  circleDiv.className = 'circle-frame circle-frame--thumb circle-frame--loading';

  const img = document.createElement('img');
  img.alt = `Coaster by ${row.name}`;
  img.src = getProcessedImageUrl(row.id);
  img.onload = () => circleDiv.classList.remove('circle-frame--loading');
  img.onerror = () => circleDiv.classList.remove('circle-frame--loading');
  circleDiv.appendChild(img);
  card.appendChild(circleDiv);

  // Submitter name
  const nameEl = document.createElement('p');
  nameEl.className = 'coaster-card__name';
  nameEl.textContent = row.name;
  card.appendChild(nameEl);

  // Instagram handle (optional) — tappable link
  if (row.instagram_handle) {
    const igEl = document.createElement('a');
    igEl.className = 'coaster-card__instagram';
    igEl.href = `https://instagram.com/${row.instagram_handle}`;
    igEl.target = '_blank';
    igEl.rel = 'noopener noreferrer';
    igEl.textContent = `@${row.instagram_handle}`;
    card.appendChild(igEl);
  }

  // Vote buttons (Story 3.3)
  const alreadyVoted = hasVoted(row.id);
  const votesEl = document.createElement('div');
  votesEl.className = 'coaster-card__votes';
  votesEl.setAttribute('role', 'group');
  votesEl.setAttribute('aria-label', 'Vote');

  const upBtn = document.createElement('button');
  upBtn.className = 'vote-btn vote-btn--up';
  upBtn.setAttribute('aria-label', 'Thumbs up');
  upBtn.textContent = '👍';

  const downBtn = document.createElement('button');
  downBtn.className = 'vote-btn vote-btn--down';
  downBtn.setAttribute('aria-label', 'Thumbs down');
  downBtn.textContent = '👎';

  if (alreadyVoted) {
    upBtn.disabled = true;
    downBtn.disabled = true;
    upBtn.classList.add('vote-btn--voted');
  } else {
    upBtn.addEventListener('click', () => onVote(row.id, 1, upBtn, downBtn));
    downBtn.addEventListener('click', () => onVote(row.id, -1, upBtn, downBtn));
  }

  votesEl.appendChild(upBtn);
  votesEl.appendChild(downBtn);
  card.appendChild(votesEl);

  return card;
}

/**
 * Renders query results into a feed section grid.
 * @param {HTMLElement} gridEl - The .feed-section__grid container
 * @param {Array|null} rows - Query results (null or empty → empty state)
 * @param {Error|null} error - Supabase query error, if any
 */
function renderFeedSection(gridEl, rows, error) {
  if (error || !rows?.length) {
    gridEl.innerHTML = '<p class="feed-section__empty">nothing here yet</p>';
    return;
  }
  rows.forEach(row => gridEl.appendChild(createCoasterCard(row)));
}

/**
 * Loads all 5 feed sections in parallel and renders results.
 * Guarded by feedLoaded flag — safe to call multiple times.
 */
async function loadFeedSections() {
  if (feedLoaded) return;
  feedLoaded = true;

  const feedEl = document.getElementById('feed-view');

  // Build skeleton sections in DOM immediately so shimmer shows while loading
  FEED_SECTIONS.forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'feed-section';
    sectionEl.id = section.id;
    sectionEl.innerHTML =
      `<h2 class="feed-section__heading">${section.heading}</h2>` +
      `<div class="feed-section__grid"></div>`;
    feedEl.appendChild(sectionEl);
  });

  // Start of current month (UTC) for "best this month" query
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  // 5 parallel queries
  const [bestAll, bestMonth, mostRecent, random, worstAll] = await Promise.all([
    db.from('submission_scores').select('*').order('net_score', { ascending: false }).limit(5),
    db.from('submission_scores').select('*').gte('created_at', startOfMonth).order('net_score', { ascending: false }).limit(5),
    db.from('submission_scores').select('*').order('created_at', { ascending: false }).limit(5),
    db.rpc('random_submissions', { n: 5 }),
    db.from('submission_scores').select('*').order('net_score', { ascending: true }).limit(5),
  ]);

  const results = [bestAll, bestMonth, mostRecent, random, worstAll];

  FEED_SECTIONS.forEach((section, i) => {
    const { data, error } = results[i];
    const gridEl = document.getElementById(section.id)?.querySelector('.feed-section__grid');
    if (!gridEl) return;
    renderFeedSection(gridEl, data, error);
  });
}

// =============================================================================
// SHARE TOAST (Story 2.6)
// Shown after successful submission — overlays the feed view.
// =============================================================================

function showShareToast() {
  const shareUrl = `https://trapadl.com/coaster/?id=${state.submissionId}`;
  document.getElementById('share-toast-url').textContent = shareUrl;
  document.getElementById('share-toast').classList.remove('is-hidden');
}

// =============================================================================
// VOTING FEED (Story 3.2)
// Sequential card-by-card voting shown after submission.
// Loads as a full-screen overlay above the 5-section feed.
// =============================================================================

let votingDeck = [];
let votingIndex = 0;

async function initVotingFeed() {
  const overlay = document.getElementById('voting-feed');
  overlay.innerHTML = '';
  overlay.classList.remove('is-hidden');

  // Load the 5-section feed behind the overlay simultaneously
  initFeedMode();

  const { data, error } = await db.rpc('random_submissions', { n: 20 });

  if (error || !data?.length) {
    showVotingEndState();
    return;
  }

  // Filter own submission and already-voted coasters
  votingDeck = data.filter(row =>
    row.id !== state.submissionId && !hasVoted(row.id)
  );
  votingIndex = 0;

  if (!votingDeck.length) {
    showVotingEndState();
    return;
  }

  showVotingCard(votingDeck[0]);
}

function showVotingCard(row) {
  const overlay = document.getElementById('voting-feed');
  overlay.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'voting-card';
  card.dataset.submissionId = row.id;

  // Score wrap + hero circle
  const scoreWrap = document.createElement('div');
  scoreWrap.className = 'voting-card__score-wrap';

  const circle = document.createElement('div');
  circle.className = 'circle-frame circle-frame--full circle-frame--loading';

  const img = document.createElement('img');
  img.alt = `Coaster by ${row.name}`;
  img.src = getProcessedImageUrl(row.id);
  img.onload = () => circle.classList.remove('circle-frame--loading');
  img.onerror = () => circle.classList.remove('circle-frame--loading');
  circle.appendChild(img);
  scoreWrap.appendChild(circle);

  const scoreBadge = document.createElement('span');
  scoreBadge.className = 'voting-card__score';
  scoreBadge.textContent = `${row.net_score > 0 ? '+' : ''}${row.net_score}`;
  scoreWrap.appendChild(scoreBadge);
  card.appendChild(scoreWrap);

  const nameEl = document.createElement('p');
  nameEl.className = 'voting-card__name';
  nameEl.textContent = row.name;
  card.appendChild(nameEl);

  if (row.instagram_handle) {
    const igEl = document.createElement('a');
    igEl.className = 'voting-card__instagram';
    igEl.href = `https://instagram.com/${row.instagram_handle}`;
    igEl.target = '_blank';
    igEl.rel = 'noopener noreferrer';
    igEl.textContent = `@${row.instagram_handle}`;
    card.appendChild(igEl);
  }

  // Vote buttons
  const votesEl = document.createElement('div');
  votesEl.className = 'voting-card__votes';
  votesEl.setAttribute('role', 'group');
  votesEl.setAttribute('aria-label', 'Vote');

  const upBtn = document.createElement('button');
  upBtn.className = 'vote-btn vote-btn--up';
  upBtn.setAttribute('aria-label', 'Thumbs up');
  upBtn.textContent = '👍';

  const downBtn = document.createElement('button');
  downBtn.className = 'vote-btn vote-btn--down';
  downBtn.setAttribute('aria-label', 'Thumbs down');
  downBtn.textContent = '👎';

  upBtn.addEventListener('click', () => onVotingCardVote(row.id, 1, card, upBtn, downBtn));
  downBtn.addEventListener('click', () => onVotingCardVote(row.id, -1, card, upBtn, downBtn));

  votesEl.appendChild(upBtn);
  votesEl.appendChild(downBtn);
  card.appendChild(votesEl);

  overlay.appendChild(card);
}

async function onVotingCardVote(submissionId, voteValue, cardEl, upBtn, downBtn) {
  // Optimistic: cookie + filled button immediately
  recordVote(submissionId);
  upBtn.disabled = true;
  downBtn.disabled = true;
  if (voteValue === 1) upBtn.classList.add('vote-btn--voted');
  else downBtn.classList.add('vote-btn--voted');

  // Async DB insert — silent fail
  db.from('votes').insert({ submission_id: submissionId, vote_value: voteValue })
    .then(({ error }) => { if (error) console.warn('[onVotingCardVote] insert failed', error); });

  // Brief pause so the filled state is visible before advancing
  setTimeout(() => advanceVotingCard(cardEl), 250);
}

function advanceVotingCard(cardEl) {
  cardEl.classList.add('is-exiting');
  setTimeout(() => {
    votingIndex += 1;
    if (votingIndex >= votingDeck.length) {
      showVotingEndState();
    } else {
      showVotingCard(votingDeck[votingIndex]);
    }
  }, 300);
}

function showVotingEndState() {
  const overlay = document.getElementById('voting-feed');
  overlay.innerHTML = '';

  const endEl = document.createElement('div');
  endEl.className = 'voting-feed__end';

  const msg = document.createElement('p');
  msg.className = 'voting-feed__end-message';
  msg.textContent = "you've voted on everything. check back later.";
  endEl.appendChild(msg);

  const browseBtn = document.createElement('button');
  browseBtn.className = 'btn btn--tertiary';
  browseBtn.textContent = 'browse the feed';
  browseBtn.addEventListener('click', () => overlay.classList.add('is-hidden'));
  endEl.appendChild(browseBtn);

  overlay.appendChild(endEl);
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
  loadFeedSections();
}

async function initShareLinkMode(shareId) {
  state.shareId = shareId;
  const feedEl = document.getElementById('feed-view');
  feedEl.hidden = false;

  // Inject featured coaster placeholder at top before sections load
  const featuredSection = document.createElement('section');
  featuredSection.className = 'feed-section featured-coaster';
  featuredSection.id = 'featured-coaster-section';
  featuredSection.innerHTML =
    `<h2 class="feed-section__heading">featured coaster</h2>` +
    `<div id="featured-coaster-body" class="featured-coaster__body"></div>`;
  feedEl.insertBefore(featuredSection, feedEl.firstChild);

  // Fetch the linked coaster and load 5 sections in parallel
  const [{ data, error }] = await Promise.all([
    db.from('submission_scores').select('*').eq('id', shareId).maybeSingle(),
    loadFeedSections(),
  ]);

  const bodyEl = document.getElementById('featured-coaster-body');

  if (error || !data) {
    // Coaster not found or hidden — silently remove the featured section
    featuredSection.remove();
    return;
  }

  renderFeaturedCoaster(bodyEl, data);
}

function renderFeaturedCoaster(containerEl, row) {
  const scoreWrap = document.createElement('div');
  scoreWrap.className = 'featured-coaster__score-wrap';

  const circle = document.createElement('div');
  circle.className = 'circle-frame circle-frame--hero circle-frame--loading';

  const img = document.createElement('img');
  img.alt = `Coaster by ${row.name}`;
  img.src = getProcessedImageUrl(row.id);
  img.onload = () => circle.classList.remove('circle-frame--loading');
  img.onerror = () => circle.classList.remove('circle-frame--loading');
  circle.appendChild(img);
  scoreWrap.appendChild(circle);

  const scoreBadge = document.createElement('span');
  scoreBadge.className = 'featured-coaster__score';
  scoreBadge.textContent = `${row.net_score > 0 ? '+' : ''}${row.net_score}`;
  scoreWrap.appendChild(scoreBadge);
  containerEl.appendChild(scoreWrap);

  const nameEl = document.createElement('p');
  nameEl.className = 'featured-coaster__name';
  nameEl.textContent = row.name;
  containerEl.appendChild(nameEl);

  if (row.instagram_handle) {
    const igEl = document.createElement('a');
    igEl.className = 'featured-coaster__instagram';
    igEl.href = `https://instagram.com/${row.instagram_handle}`;
    igEl.target = '_blank';
    igEl.rel = 'noopener noreferrer';
    igEl.textContent = `@${row.instagram_handle}`;
    containerEl.appendChild(igEl);
  }

  const alreadyVoted = hasVoted(row.id);
  const votesEl = document.createElement('div');
  votesEl.className = 'featured-coaster__votes';
  votesEl.setAttribute('role', 'group');
  votesEl.setAttribute('aria-label', 'Vote');

  const upBtn = document.createElement('button');
  upBtn.className = 'vote-btn vote-btn--up';
  upBtn.setAttribute('aria-label', 'Thumbs up');
  upBtn.textContent = '👍';

  const downBtn = document.createElement('button');
  downBtn.className = 'vote-btn vote-btn--down';
  downBtn.setAttribute('aria-label', 'Thumbs down');
  downBtn.textContent = '👎';

  if (alreadyVoted) {
    upBtn.disabled = true;
    downBtn.disabled = true;
    upBtn.classList.add('vote-btn--voted');
  } else {
    // No advance on featured coaster — just disable after voting
    upBtn.addEventListener('click', () => onVote(row.id, 1, upBtn, downBtn));
    downBtn.addEventListener('click', () => onVote(row.id, -1, upBtn, downBtn));
  }

  votesEl.appendChild(upBtn);
  votesEl.appendChild(downBtn);
  containerEl.appendChild(votesEl);
}

// =============================================================================
// DOM READY — Route to correct mode based on URL params
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Coaster] Supabase client initialised');

  // Event listeners
  document.querySelector('[data-action="submit-cta"]')
    ?.addEventListener('click', () => goToStep('camera'));

  document.querySelector('[data-action="browse-feed"]')
    ?.addEventListener('click', initFeedMode);

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
    ?.addEventListener('click', initVotingFeed);

  // Share toast (Story 2.6)
  document.querySelector('[data-action="dismiss-share-toast"]')
    ?.addEventListener('click', () => {
      document.getElementById('share-toast').classList.add('is-hidden');
    });

  document.querySelector('[data-action="share-coaster"]')
    ?.addEventListener('click', () => {
      const shareUrl = `https://trapadl.com/coaster/?id=${state.submissionId}`;
      if (navigator.share) {
        navigator.share({ url: shareUrl, text: 'Vote for my coaster on trapadl.com!' })
          .catch(err => { if (err.name !== 'AbortError') navigator.clipboard.writeText(shareUrl).catch(() => {}); });
      } else {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
    });

  document.querySelector('[data-action="copy-share-link"]')
    ?.addEventListener('click', () => {
      const shareUrl = `https://trapadl.com/coaster/?id=${state.submissionId}`;
      const copyBtn = document.getElementById('share-toast-copy-btn');
      navigator.clipboard.writeText(shareUrl).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
      }).catch(() => {});
    });

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
