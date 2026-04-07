/* =============================================================================
   Coaster Admin Portal — script.js
   Desktop-only. All privileged actions route through admin-action Edge Function.
   Password validated server-side on every request.
   ============================================================================= */

const SUPABASE_URL = 'https://snmwmyladvuevtatefeo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubXdteWxhZHZ1ZXZ0YXRlZmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDc1NTQsImV4cCI6MjA4OTYyMzU1NH0.06TfZiiiupLZovfZNlZCS0Vc2NsEss9tZhU0lswI3ro';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Password held in memory for the session.
// Also mirrored in sessionStorage so page refresh doesn't force re-login.
let adminPassword = null;

// =============================================================================
// SCREEN MANAGEMENT
// =============================================================================

function showScreen(id) {
  document.querySelectorAll('.admin-screen').forEach(el => el.classList.add('is-hidden'));
  document.getElementById(id)?.classList.remove('is-hidden');
}

// =============================================================================
// AUTH
// =============================================================================

async function authenticate(password) {
  const { data, error } = await db.functions.invoke('admin-action', {
    body: { password, action: 'authenticate' },
  });

  if (error || !data?.success) return false;

  adminPassword = password;
  sessionStorage.setItem('admin_authed', 'true');
  sessionStorage.setItem('admin_password', password);
  return true;
}

function logout() {
  adminPassword = null;
  sessionStorage.removeItem('admin_authed');
  sessionStorage.removeItem('admin_password');
  document.getElementById('password-input').value = '';
  showScreen('auth-screen');
}

// =============================================================================
// SUBMISSION LIST
// =============================================================================

async function loadSubmissions() {
  document.getElementById('admin-loading').classList.remove('is-hidden');
  document.getElementById('submission-list').innerHTML =
    '<p class="admin-loading" id="admin-loading">Loading submissions...</p>';

  const { data, error } = await db.functions.invoke('admin-action', {
    body: { password: adminPassword, action: 'list-all' },
  });

  const listEl = document.getElementById('submission-list');
  listEl.innerHTML = '';

  if (error || !data?.success) {
    listEl.innerHTML = '<p class="admin-empty">Failed to load submissions.</p>';
    return;
  }

  const submissions = data.data ?? [];

  const countEl = document.getElementById('submission-count');
  countEl.textContent = `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`;

  if (!submissions.length) {
    listEl.innerHTML = '<p class="admin-empty">No submissions yet.</p>';
    return;
  }

  submissions.forEach(row => listEl.appendChild(createAdminCard(row)));
}

// =============================================================================
// ADMIN CARD
// =============================================================================

function formatDate(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function safeFilename(name, submissionId) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const short = submissionId.slice(0, 8);
  return `${slug}-coaster-${short}`;
}

function createAdminCard(row) {
  const card = document.createElement('div');
  card.className = `admin-card${row.is_hidden ? ' admin-card--hidden' : ''}`;
  card.dataset.submissionId = row.id;

  // ── Thumbnail ──────────────────────────────────────────────────────────────
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'admin-card__thumb';

  const circle = document.createElement('div');
  circle.className = 'circle-frame circle-frame--thumb circle-frame--loading';

  const img = document.createElement('img');
  img.alt = `Coaster by ${row.name}`;
  img.src = `${SUPABASE_URL}/storage/v1/object/public/processed-images/${row.id}/processed.webp`;
  img.onload = () => circle.classList.remove('circle-frame--loading');
  img.onerror = () => circle.classList.remove('circle-frame--loading');
  circle.appendChild(img);
  thumbWrap.appendChild(circle);
  card.appendChild(thumbWrap);

  // ── Meta ───────────────────────────────────────────────────────────────────
  const meta = document.createElement('div');
  meta.className = 'admin-card__meta';

  const nameEl = document.createElement('p');
  nameEl.className = 'admin-card__name';
  nameEl.textContent = row.name || '(no name)';
  meta.appendChild(nameEl);

  const emailEl = document.createElement('p');
  emailEl.className = 'admin-card__email';
  emailEl.textContent = row.email || '(no email)';
  meta.appendChild(emailEl);

  const igEl = document.createElement('p');
  igEl.className = 'admin-card__instagram';
  igEl.textContent = row.instagram_handle ? `@${row.instagram_handle}` : '—';
  meta.appendChild(igEl);

  const rowMeta = document.createElement('div');
  rowMeta.className = 'admin-card__row';

  const dateEl = document.createElement('span');
  dateEl.className = 'admin-card__date';
  dateEl.textContent = formatDate(row.created_at);
  rowMeta.appendChild(dateEl);

  const scoreEl = document.createElement('span');
  scoreEl.className = 'admin-card__score';
  const sign = row.net_score > 0 ? '+' : '';
  scoreEl.textContent = `score: ${sign}${row.net_score}`;
  rowMeta.appendChild(scoreEl);

  const badge = document.createElement('span');
  badge.className = row.is_hidden
    ? 'admin-badge admin-badge--hidden'
    : row.is_verified
    ? 'admin-badge admin-badge--visible'
    : 'admin-badge admin-badge--unverified';
  badge.textContent = row.is_hidden ? 'Hidden' : row.is_verified ? 'Visible' : 'Unverified';
  rowMeta.appendChild(badge);

  meta.appendChild(rowMeta);
  card.appendChild(meta);

  // ── Actions ────────────────────────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'admin-card__actions';

  // Hide / Restore
  const visibilityRow = document.createElement('div');
  visibilityRow.className = 'admin-action-row';

  if (row.is_hidden) {
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'admin-btn';
    restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', () => onRestore(row.id, card, badge, restoreBtn));
    visibilityRow.appendChild(restoreBtn);
  } else {
    const hideBtn = document.createElement('button');
    hideBtn.className = 'admin-btn';
    hideBtn.textContent = 'Hide';
    hideBtn.addEventListener('click', () => onHide(row.id, card, badge, hideBtn));
    visibilityRow.appendChild(hideBtn);
  }

  // Delete
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'admin-btn admin-btn--danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => showDeleteConfirm(card, deleteConfirmEl));
  visibilityRow.appendChild(deleteBtn);

  actions.appendChild(visibilityRow);

  // Replace image
  const replaceLabel = document.createElement('label');
  replaceLabel.className = 'admin-btn admin-replace-label';
  replaceLabel.textContent = 'Replace image';

  const replaceInput = document.createElement('input');
  replaceInput.type = 'file';
  replaceInput.accept = 'image/*';
  replaceInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) onReplaceImage(row.id, file, img, replaceLabel);
  });
  replaceLabel.appendChild(replaceInput);
  actions.appendChild(replaceLabel);

  // Download row
  const downloadRow = document.createElement('div');
  downloadRow.className = 'admin-download-row';

  const dlRawBtn = document.createElement('button');
  dlRawBtn.className = 'admin-btn';
  dlRawBtn.textContent = 'Download original';
  dlRawBtn.addEventListener('click', () => onDownloadRaw(row.id, row.name));
  downloadRow.appendChild(dlRawBtn);

  const dlProcessedBtn = document.createElement('button');
  dlProcessedBtn.className = 'admin-btn';
  dlProcessedBtn.textContent = 'Download processed';
  dlProcessedBtn.addEventListener('click', () => onDownloadProcessed(row.id, row.name));
  downloadRow.appendChild(dlProcessedBtn);

  actions.appendChild(downloadRow);

  // Delete confirm (inline, hidden)
  const deleteConfirmEl = document.createElement('div');
  deleteConfirmEl.className = 'delete-confirm is-hidden';
  deleteConfirmEl.innerHTML = `
    <p>Permanently delete this submission and all its images? This cannot be undone.</p>
    <div class="delete-confirm__btns">
      <button class="admin-btn admin-btn--confirm confirm-delete-btn">Yes, delete</button>
      <button class="admin-btn cancel-delete-btn">Cancel</button>
    </div>
  `;
  deleteConfirmEl.querySelector('.confirm-delete-btn')
    .addEventListener('click', () => onDelete(row.id, card));
  deleteConfirmEl.querySelector('.cancel-delete-btn')
    .addEventListener('click', () => deleteConfirmEl.classList.add('is-hidden'));
  actions.appendChild(deleteConfirmEl);

  card.appendChild(actions);
  return card;
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

async function onHide(submissionId, cardEl, badgeEl, btn) {
  btn.disabled = true;
  btn.textContent = 'Hiding...';

  const { data, error } = await db.functions.invoke('admin-action', {
    body: { password: adminPassword, action: 'hide', submissionId },
  });

  if (error || !data?.success) {
    btn.disabled = false;
    btn.textContent = 'Hide';
    alert('Failed to hide submission.');
    return;
  }

  cardEl.classList.add('admin-card--hidden');
  badgeEl.className = 'admin-badge admin-badge--hidden';
  badgeEl.textContent = 'Hidden';

  // Swap Hide → Restore button
  btn.textContent = 'Restore';
  btn.disabled = false;
  btn.className = 'admin-btn';
  btn.replaceWith(btn); // force re-render
  const newBtn = document.createElement('button');
  newBtn.className = 'admin-btn';
  newBtn.textContent = 'Restore';
  newBtn.addEventListener('click', () => onRestore(submissionId, cardEl, badgeEl, newBtn));
  btn.parentElement.insertBefore(newBtn, btn);
  btn.remove();
}

async function onRestore(submissionId, cardEl, badgeEl, btn) {
  btn.disabled = true;
  btn.textContent = 'Restoring...';

  const { data, error } = await db.functions.invoke('admin-action', {
    body: { password: adminPassword, action: 'restore', submissionId },
  });

  if (error || !data?.success) {
    btn.disabled = false;
    btn.textContent = 'Restore';
    alert('Failed to restore submission.');
    return;
  }

  cardEl.classList.remove('admin-card--hidden');
  badgeEl.className = 'admin-badge admin-badge--visible';
  badgeEl.textContent = 'Visible';

  // Swap Restore → Hide
  const newBtn = document.createElement('button');
  newBtn.className = 'admin-btn';
  newBtn.textContent = 'Hide';
  newBtn.addEventListener('click', () => onHide(submissionId, cardEl, badgeEl, newBtn));
  btn.parentElement.insertBefore(newBtn, btn);
  btn.remove();
}

function showDeleteConfirm(cardEl, confirmEl) {
  confirmEl.classList.remove('is-hidden');
  cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function onDelete(submissionId, cardEl) {
  const confirmBtn = cardEl.querySelector('.confirm-delete-btn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting...'; }

  const { data, error } = await db.functions.invoke('admin-action', {
    body: { password: adminPassword, action: 'delete', submissionId },
  });

  if (error || !data?.success) {
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Yes, delete'; }
    alert('Failed to delete submission.');
    return;
  }

  // Animate out then remove
  cardEl.style.transition = 'opacity 200ms, transform 200ms';
  cardEl.style.opacity = '0';
  cardEl.style.transform = 'translateX(20px)';
  setTimeout(() => cardEl.remove(), 200);

  // Update count
  const countEl = document.getElementById('submission-count');
  const current = parseInt(countEl.textContent) || 0;
  const next = Math.max(0, current - 1);
  countEl.textContent = `${next} submission${next !== 1 ? 's' : ''}`;
}

async function onReplaceImage(submissionId, file, imgEl, labelEl) {
  labelEl.textContent = 'Uploading...';
  labelEl.style.opacity = '0.5';

  const reader = new FileReader();
  reader.onload = async (e) => {
    // Strip data:...;base64, prefix
    const base64 = e.target.result.split(',')[1];

    const { data, error } = await db.functions.invoke('admin-action', {
      body: { password: adminPassword, action: 'replace-image', submissionId, imageBase64: base64 },
    });

    labelEl.style.opacity = '';
    labelEl.textContent = 'Replace image';

    if (error || !data?.success) {
      alert('Failed to replace image.');
      return;
    }

    // Force-refresh the thumbnail by cache-busting the URL
    imgEl.src = `${SUPABASE_URL}/storage/v1/object/public/processed-images/${submissionId}/processed.webp?t=${Date.now()}`;
  };
  reader.readAsDataURL(file);
}

async function onDownloadRaw(submissionId, submitterName) {
  const { data, error } = await db.functions.invoke('admin-action', {
    body: { password: adminPassword, action: 'download-raw', submissionId },
  });

  if (error || !data?.success || !data.data?.signedUrl) {
    alert('Failed to generate download link.');
    return;
  }

  triggerDownload(data.data.signedUrl, `${safeFilename(submitterName, submissionId)}.jpg`);
}

function onDownloadProcessed(submissionId, submitterName) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/processed-images/${submissionId}/processed.webp`;
  triggerDownload(url, `${safeFilename(submitterName, submissionId)}.webp`);
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// =============================================================================
// INIT
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Desktop gate — < 1024px shows unsupported screen
  if (window.innerWidth < 1024) {
    showScreen('unsupported-screen');
    return;
  }

  // Wire login
  const loginBtn = document.getElementById('login-btn');
  const passwordInput = document.getElementById('password-input');
  const authError = document.getElementById('auth-error');

  async function doLogin() {
    const password = passwordInput.value;
    if (!password) return;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    authError.classList.add('is-hidden');

    const ok = await authenticate(password);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';

    if (!ok) {
      authError.classList.remove('is-hidden');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    showScreen('admin-view');
    loadSubmissions();
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // Check if already authed this session
  const authed = sessionStorage.getItem('admin_authed');
  const storedPassword = sessionStorage.getItem('admin_password');

  if (authed === 'true' && storedPassword) {
    adminPassword = storedPassword;
    showScreen('admin-view');
    loadSubmissions();
  } else {
    showScreen('auth-screen');
    passwordInput.focus();
  }
});
