/* ================================================
   app.js  —  Shared utilities for PeerReview
   No external CSS dependency. Toasts are self-styled.
   ================================================ */

const API_BASE = 'https://peerreview-paper-review-platform.onrender.com/api';

/* ── AUTH ───────────────────────────────────────── */
const Auth = {
  getToken() {
    return localStorage.getItem('token');
  },
  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  save(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    this.clear();
    window.location.href = 'login.html';
  },
  requireAuth(role) {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return null;
    }
    const user = this.getUser();
    if (role && user.role !== role) {
      window.location.href = 'dashboard.html';
      return null;
    }
    return user;
  },
};

/* ── API ─────────────────────────────────────────── */
const Api = {
  async request(method, endpoint, body = null, isForm = false) {
    const headers = {};
    const token = Auth.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!isForm) headers['Content-Type'] = 'application/json';
    const opts = { method, headers };
    if (body) opts.body = isForm ? body : JSON.stringify(body);
    try {
      const res = await fetch(API_BASE + endpoint, opts);
      const data = await res.json();
      if (res.status === 401) {
        Auth.clear();
        window.location.href = 'login.html';
        return null;
      }
      return { ok: res.ok, data };
    } catch (e) {
      return {
        ok: false,
        data: { message: 'Cannot reach server. Is it running on port 5000?' },
      };
    }
  },
  get(ep) {
    return this.request('GET', ep);
  },
  post(ep, body) {
    return this.request('POST', ep, body);
  },
  postForm(ep, fd) {
    return this.request('POST', ep, fd, true);
  },
};

/* ── TOAST ───────────────────────────────────────── */
/* Self-contained: injects its own <style> and container */
const Toast = {
  ready: false,
  setup() {
    if (this.ready) return;
    this.ready = true;
    /* Inject toast styles once */
    const s = document.createElement('style');
    s.textContent = `
      #toast-wrap {
        position: fixed; top: 70px; right: 18px; z-index: 9999;
        display: flex; flex-direction: column; gap: 8px; pointer-events: none;
      }
      .t-item {
        font-family: 'Segoe UI', Arial, sans-serif;
        background: #fff; border: 1px solid #dde3ea;
        border-radius: 8px; padding: 12px 14px;
        min-width: 260px; max-width: 340px;
        display: flex; align-items: flex-start; gap: 10px;
        box-shadow: 0 4px 14px rgba(0,0,0,.12);
        pointer-events: all;
        animation: tIn .22s ease forwards;
      }
      .t-item.ok  { border-left: 4px solid #1e6b45; }
      .t-item.err { border-left: 4px solid #c0392b; }
      .t-item.wrn { border-left: 4px solid #c9a84c; }
      .t-icon { font-size: .95rem; margin-top: 1px; }
      .t-body { flex: 1; }
      .t-title { font-size: .84rem; font-weight: 700; color: #0d1b2a; }
      .t-msg   { font-size: .78rem; color: #3a4a5c; margin-top: 2px; }
      .t-x { background: none; border: none; color: #7a8899; cursor: pointer; font-size: 1rem; }
      @keyframes tIn  { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:translateX(0); } }
      @keyframes tOut { to   { opacity:0; transform:translateX(18px); max-height:0; padding:0; margin:0; } }
      .t-item.bye { animation: tOut .22s ease forwards; }
    `;
    document.head.appendChild(s);
    /* Create container */
    const c = document.createElement('div');
    c.id = 'toast-wrap';
    document.body.appendChild(c);
  },
  show(title, msg, type, duration = 4000) {
    this.setup();
    const icons = { ok: '✓', err: '✕', wrn: '⚠' };
    const el = document.createElement('div');
    el.className = 't-item ' + type;
    el.innerHTML =
      '<span class="t-icon">' +
      (icons[type] || 'ℹ') +
      '</span>' +
      '<div class="t-body">' +
      '<div class="t-title">' +
      title +
      '</div>' +
      (msg ? '<div class="t-msg">' + msg + '</div>' : '') +
      '</div>' +
      '<button class="t-x" onclick="this.closest(\'.t-item\').remove()">×</button>';
    document.getElementById('toast-wrap').appendChild(el);
    setTimeout(() => {
      el.classList.add('bye');
      setTimeout(() => el.remove(), 230);
    }, duration);
  },
  success(t, m) {
    this.show(t, m, 'ok');
  },
  error(t, m) {
    this.show(t, m, 'err');
  },
  warning(t, m) {
    this.show(t, m, 'wrn');
  },
};

/* ── HELPERS ─────────────────────────────────────── */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* Status badge — returns raw HTML string */
function statusBadge(status) {
  const styles = {
    pending: 'background:#fef9ec;color:#9a6a00;',
    under_review: 'background:#eaf2fb;color:#1a5276;',
    accepted: 'background:#edfaf3;color:#1e6b45;',
    rejected: 'background:#fdf2f0;color:#c0392b;',
  };
  const labels = {
    pending: '● Pending',
    under_review: '◎ Under Review',
    accepted: '✓ Accepted',
    rejected: '✕ Rejected',
  };
  const s = styles[status] || styles.pending;
  const l = labels[status] || status;
  return (
    '<span style="' +
    s +
    'padding:3px 10px;border-radius:20px;font-size:.72rem;font-weight:700;">' +
    l +
    '</span>'
  );
}

/* Star display — read-only */
function starsHtml(rating) {
  let h = '';
  for (let i = 1; i <= 5; i++)
    h +=
      '<span style="color:' +
      (i <= rating ? '#f59e0b' : '#dde3ea') +
      ';font-size:.88rem;">★</span>';
  return '<span>' + h + '</span>';
}

/* Recommendation badge */
function recBadge(rec) {
  const map = {
    accept: ['#edfaf3', '#1e6b45', '✓ Accept'],
    reject: ['#fdf2f0', '#c0392b', '✕ Reject'],
    major_revision: ['#fef9ec', '#9a6a00', '⚠ Major Revision'],
    minor_revision: ['#eaf2fb', '#1a5276', '↺ Minor Revision'],
  };
  const [bg, color, label] = map[rec] || ['#f0f0f0', '#555', rec];
  return (
    '<span style="background:' +
    bg +
    ';color:' +
    color +
    ';padding:3px 10px;border-radius:20px;font-size:.74rem;font-weight:700;">' +
    label +
    '</span>'
  );
}

/* Button loading state */
function setLoading(btn, on) {
  if (on) {
    btn.disabled = true;
    btn._txt = btn.textContent;
    btn.textContent = '';
    btn.style.position = 'relative';
    const sp = document.createElement('span');
    sp.id = 'btn-spinner';
    sp.style.cssText =
      'width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .6s linear infinite;';
    btn.appendChild(sp);
  } else {
    btn.disabled = false;
    btn.textContent = btn._txt || '';
  }
}

/* Open / close modals */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

/* Click backdrop to close */
document.addEventListener('click', (e) => {
  if (e.target.dataset.modal === 'overlay') e.target.style.display = 'none';
});

/* Spin keyframe — injected once */
(function () {
  const s = document.createElement('style');
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
})();

/* ── NAVBAR ──────────────────────────────────────── */
/* Injects its own styles and builds the nav HTML */
function buildNavbar(activePage) {
  const user = Auth.getUser();
  const nav = document.getElementById('navbar');
  if (!user || !nav) return;

  /* Inject navbar styles once */
  if (!document.getElementById('nb-style')) {
    const s = document.createElement('style');
    s.id = 'nb-style';
    s.textContent = `
      #navbar {
        background: #0d1b2a; position: sticky; top: 0; z-index: 100;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
      }
      .nb-inner {
        display: flex; align-items: center; justify-content: space-between;
        height: 60px; max-width: 1140px; margin: 0 auto; padding: 0 24px;
      }
      .nb-brand {
        display: flex; align-items: center; gap: 10px; color: #fff;
        font-family: 'Segoe UI', Arial, sans-serif; font-size: 1rem;
        font-weight: 700; text-decoration: none;
      }
      .nb-dot {
        width: 28px; height: 28px; background: #c9a84c; border-radius: 6px;
        display: flex; align-items: center; justify-content: center; font-size: 1rem;
      }
      .nb-links { display: flex; align-items: center; gap: 4px; list-style: none; }
      .nb-link {
        color: rgba(255,255,255,.7); font-family: 'Segoe UI', Arial, sans-serif;
        font-size: .875rem; font-weight: 500; padding: 6px 13px;
        border-radius: 6px; text-decoration: none; transition: background .15s;
      }
      .nb-link:hover  { color: #fff; background: rgba(255,255,255,.1); }
      .nb-link.active { color: #fff; background: rgba(201,168,76,.25); }
      .nb-role {
        font-size: .7rem; font-weight: 600; padding: 2px 10px; border-radius: 20px;
        background: rgba(201,168,76,.2); color: #e2c47a; text-transform: capitalize;
      }
      .nb-name { font-size: .82rem; color: rgba(255,255,255,.55); padding: 0 8px;
        font-family: 'Segoe UI', Arial, sans-serif; }
      .nb-logout {
        background: none; border: 1px solid rgba(255,255,255,.2);
        color: rgba(255,255,255,.6); font-family: 'Segoe UI', Arial, sans-serif;
        font-size: .8rem; padding: 5px 12px; border-radius: 6px; cursor: pointer;
        transition: all .15s;
      }
      .nb-logout:hover { border-color: #c0392b; color: #e57373; background: rgba(192,57,43,.15); }
    `;
    document.head.appendChild(s);
  }

  const linkMap = {
    author: [
      { id: 'dashboard', href: 'dashboard.html', label: 'My Papers' },
      { id: 'submit', href: 'submit.html', label: 'Submit Paper' },
    ],
    reviewer: [
      { id: 'dashboard', href: 'dashboard.html', label: 'Assigned Papers' },
    ],
    admin: [{ id: 'dashboard', href: 'dashboard.html', label: 'All Papers' }],
  };

  const links = linkMap[user.role] || [];
  nav.innerHTML =
    '<div class="nb-inner">' +
    '<a href="dashboard.html" class="nb-brand"><div class="nb-dot">📋</div>PeerReview</a>' +
    '<ul class="nb-links">' +
    links
      .map(
        (l) =>
          '<li><a href="' +
          l.href +
          '" class="nb-link' +
          (l.id === activePage ? ' active' : '') +
          '">' +
          l.label +
          '</a></li>'
      )
      .join('') +
    '<li><span class="nb-role">' +
    user.role +
    '</span></li>' +
    '<li><span class="nb-name">' +
    user.name +
    '</span></li>' +
    '<li><button class="nb-logout" onclick="Auth.logout()">Sign Out</button></li>' +
    '</ul>' +
    '</div>';
}

/* ── STAR RATING (interactive) ───────────────────── */
function initStars(containerId, inputId) {
  const box = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  if (!box || !input) return;
  let cur = 0;
  box.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    s.style.cssText =
      'font-size:1.8rem;cursor:pointer;color:#dde3ea;transition:color .1s;user-select:none;';
    s.onmouseover = () =>
      box
        .querySelectorAll('span')
        .forEach((x, j) => (x.style.color = j < i ? '#f59e0b' : '#dde3ea'));
    s.onmouseleave = () =>
      box
        .querySelectorAll('span')
        .forEach((x, j) => (x.style.color = j < cur ? '#f59e0b' : '#dde3ea'));
    s.onclick = () => {
      cur = i;
      input.value = i;
      box
        .querySelectorAll('span')
        .forEach((x, j) => (x.style.color = j < i ? '#f59e0b' : '#dde3ea'));
    };
    box.appendChild(s);
  }
}

/* ── PDF DOWNLOAD URL HELPER ───────────────────────────── */

function pdfUrl(fileUrl) {
  if (!fileUrl) return '#';

  // If it's a Cloudinary URL, add download parameters
  if (fileUrl.includes('cloudinary.com')) {
    // Add fl_attachment to force download instead of opening in browser
    return fileUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  // If it's a local file path, use the download API route
  if (fileUrl.startsWith('/uploads/') || !fileUrl.includes('://')) {
    const filename = fileUrl.replace('/uploads/', '');
    return '/api/download/' + filename;
  }

  return fileUrl; // Fallback for other URLs
}
