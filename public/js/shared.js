// ── WanderGo Shared JS ──────────────────────────────────
const API = "/api";

// ── Auth helpers ─────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem("wg_token"),
  getUser: () => { try { return JSON.parse(localStorage.getItem("wg_user")); } catch { return null; } },
  setSession: (token, user) => {
    localStorage.setItem("wg_token", token);
    localStorage.setItem("wg_user", JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem("wg_token");
    localStorage.removeItem("wg_user");
  },
  isLoggedIn: () => !!localStorage.getItem("wg_token"),
  requireAuth: (role) => {
    const user = Auth.getUser();
    if (!user) { window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname); return false; }
    if (role && user.role !== role && user.role !== "admin") {
      Toast.show("Access denied.", "error");
      setTimeout(() => window.location.href = "/", 1500);
      return false;
    }
    return true;
  },
};

// ── API helper ────────────────────────────────────────────
async function api(endpoint, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  const token = Auth.getToken();
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(`${API}${endpoint}`, opts);
    const data = await r.json();
    if (r.status === 401) {
      Auth.clear();
      window.location.href = "/login";
    }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, data: { error: "Network error. Check your connection." } };
  }
}

// ── Toast notifications ───────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  },
  show(message, type = "info", duration = 3500) {
    this.init();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icons = { success: "✓", error: "✕", warning: "!", info: "i" };
    toast.innerHTML = `<span style="font-weight:700">${icons[type] || "i"}</span> ${message}`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
};

// ── Navbar builder ────────────────────────────────────────
function buildNavbar(activePage = "") {
  const user = Auth.getUser();
  const nav = document.getElementById("navbar");
  if (!nav) return;

  const links = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore" },
    { href: "/events", label: "Events" },
  ];

  const linksHTML = links.map(l =>
    `<a href="${l.href}" class="nav-link${activePage === l.label ? " active" : ""}">${l.label}</a>`
  ).join("");

  let rightHTML = "";
  if (user) {
    const initial = user.name ? user.name[0].toUpperCase() : "U";
    const dashHref = user.role === "host" ? "/host-dashboard" : "/dashboard";
    rightHTML = `
      <a href="/messages" class="nav-link nav-badge" id="msgBadge">
        Messages
        <span class="nav-badge-count" id="unreadCount" style="display:none">0</span>
      </a>
      <a href="${dashHref}" class="btn btn-ghost btn-sm">${user.role === "host" ? "Host Dashboard" : "Dashboard"}</a>
      <div class="nav-avatar" title="${user.name}" onclick="window.location='/profile'">${initial}</div>
      <button class="btn btn-sm" style="border:1.5px solid #e2e5ec;background:white;color:#6b7080" onclick="logout()">Sign Out</button>
    `;
  } else {
    rightHTML = `
      <a href="/login" class="btn btn-ghost btn-sm">Sign In</a>
      <a href="/register" class="btn btn-primary btn-sm">Get Started</a>
    `;
  }

  nav.innerHTML = `
    <a href="/" class="nav-brand">Wander<span>Go</span></a>
    <div class="nav-links">${linksHTML}</div>
    <div class="nav-right">${rightHTML}</div>
  `;

  // Load unread count
  if (user) loadUnreadCount();
}

async function loadUnreadCount() {
  const r = await api("/messages/unread-count");
  if (r.ok && r.data.count > 0) {
    const badge = document.getElementById("unreadCount");
    if (badge) { badge.textContent = r.data.count; badge.style.display = "flex"; }
  }
}

function logout() {
  Auth.clear();
  Toast.show("Signed out successfully.", "success");
  setTimeout(() => window.location.href = "/", 800);
}

// ── Skeleton cards ────────────────────────────────────────
function skeletonCards(n = 6) {
  return Array(n).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>`).join("");
}

// ── Event card HTML ───────────────────────────────────────
function eventCardHTML(ev, opts = {}) {
  const { showActions = false, bookingId = null, isOwner = false } = opts;
  const user = Auth.getUser();
  const date = ev.date
    ? new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const img = (ev.image && ev.image.trim() !== "")
    ? ev.image
    : "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=75";
  const city = ev.location?.city || ev.location || "";
  const price = ev.price > 0
    ? `<span class="event-price">₹${ev.price.toLocaleString()} <small>/ person</small></span>`
    : `<span class="event-price" style="color:var(--green)">Free</span>`;

  return `
    <div class="event-card">
      <a href="/event-detail?id=${ev._id}">
        <div class="event-card-image">
          <img src="${img}" alt="${ev.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=75'"/>
          ${ev.category ? `<span class="event-card-badge">${ev.category}</span>` : ""}
          ${ev.offer ? `<span class="event-card-offer">${ev.offer}</span>` : ""}
        </div>
      </a>
      <div class="event-card-body">
        <div class="event-card-meta">
          ${city ? `<span>📍 ${city}</span>` : ""}
          ${date ? `<span>🗓 ${date}</span>` : ""}
        </div>
        <a href="/event-detail?id=${ev._id}">
          <h3 class="event-card-title">${ev.title}</h3>
        </a>
        <p class="event-card-desc">${(ev.description || "").substring(0, 100)}${(ev.description || "").length > 100 ? "..." : ""}</p>
        <div class="event-card-footer">
          ${price}
          <div class="event-stats">
            <span>♥ ${ev.likes || 0}</span>
            <span>👁 ${ev.views || 0}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Pagination ────────────────────────────────────────────
function renderPagination(containerId, page, totalPages, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ""; return; }
  el.innerHTML = Array.from({ length: totalPages }, (_, i) =>
    `<button class="page-btn${i + 1 === page ? " active" : ""}" onclick="(${onPageChange.toString()})(${i + 1})">${i + 1}</button>`
  ).join("");
}

// ── Debounce ──────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── Date helpers ──────────────────────────────────────────
function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
