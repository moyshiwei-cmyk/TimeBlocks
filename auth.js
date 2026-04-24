// ─── auth.js ─────────────────────────────────────────────────────────────────
// Loaded AFTER firebase scripts, BEFORE all other app scripts.
// Responsibilities:
//   1. Show login screen until Google sign-in resolves
//   2. Store signed-in user as window.TF_USER
//   3. Expose getUserPrefix() so state.js can namespace localStorage per-user
//   4. Call init() only after auth is confirmed (prevents race conditions)
//   5. Wire the sign-out action called from ui.js renderProfile()

const _auth     = firebase.auth();
const _provider = new firebase.auth.GoogleAuthProvider();

// Accessible globally so state.js helpers can call it before TF_USER is set
window.getUserPrefix = function() {
  return window.TF_USER ? window.TF_USER.uid + '_' : 'guest_';
};

// ── Auth state listener — boots or locks the app ─────────────────────────────
_auth.onAuthStateChanged(function(user) {
  const loginScreen = document.getElementById('login-screen');
  const appEl       = document.getElementById('app');

  if (user) {
    window.TF_USER = user;

    // Hide login, reveal app
    loginScreen.style.display = 'none';
    appEl.style.display       = '';

    // Personalise sidebar immediately (before init draws anything)
    _updateSidebarUser(user);

    // Boot the app — init() is defined at the bottom of ui.js
    // We call it here instead of letting ui.js auto-run it
    if (typeof init === 'function') init();

  } else {
    window.TF_USER = null;
    loginScreen.style.display = 'flex';
    appEl.style.display       = 'none';
  }
});

// ── Google sign-in button ────────────────────────────────────────────────────
document.getElementById('google-login-btn').addEventListener('click', function() {
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('google-login-btn');
  btn.textContent = 'Signing in…';
  btn.disabled = true;

  _auth.signInWithPopup(_provider).catch(function(err) {
    btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20"/> Continue with Google';
    btn.disabled = false;
    errEl.textContent  = err.code === 'auth/popup-closed-by-user'
      ? 'Sign-in cancelled. Please try again.'
      : 'Sign-in failed: ' + err.message;
    errEl.style.display = 'block';
  });
});

// ── Update sidebar avatar + name with Google account data ────────────────────
function _updateSidebarUser(user) {
  const nameEl   = document.querySelector('.sb-user-name');
  const avEl     = document.getElementById('sb-av');
  if (nameEl) nameEl.textContent = user.displayName || 'Time Architect';
  if (avEl) {
    if (user.photoURL) {
      avEl.innerHTML = `<img src="${user.photoURL}"
        style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block"
        referrerpolicy="no-referrer" alt="avatar"/>`;
    } else {
      avEl.textContent = (user.displayName||'U')[0].toUpperCase();
    }
  }
}

// ── Sign-out — called from renderProfile() in ui.js ─────────────────────────
function signOutUser() {
  _auth.signOut().then(function() {
    window.TF_USER = null;
    window.location.reload();   // cleanest way to reset all in-memory state
  }).catch(function(err) {
    showToast('Sign-out failed: ' + err.message);
  });
}
