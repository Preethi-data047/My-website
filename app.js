/* =========================================================
   app.js — Shared logic for FreelanceOS
   Sections:
   1.  Shortcuts
   2.  Toast notifications
   3.  Number & currency helpers
   4.  Date helpers
   5.  Escape / sanitize helpers
   6.  Navigation (hash routing)
   7.  Footer year
   8.  Debounce helper
   9.  Boot
   ========================================================= */


/* =========================================================
   1. SHORTCUTS
   ========================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


/* =========================================================
   2. TOAST NOTIFICATIONS
   ========================================================= */
function toast(message, type = "info", duration = 2600) {
  const stack = $("#toastStack");
  if (!stack) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);

  setTimeout(() => {
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 260);
  }, duration);
}


/* =========================================================
   3. NUMBER & CURRENCY HELPERS
   ========================================================= */
const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ"
};

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount, currency = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  const safe = toNumber(amount);
  const formatted = safe.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}

function round2(n) {
  return Math.round((toNumber(n) + Number.EPSILON) * 100) / 100;
}


/* =========================================================
   4. DATE HELPERS
   ========================================================= */
function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysISO(iso, days) {
  const d = new Date(iso || todayISO());
  d.setDate(d.getDate() + days);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateHuman(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


/* =========================================================
   5. ESCAPE / SANITIZE HELPERS
   (prevents broken HTML when users type special characters)
   ========================================================= */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(raw) {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // If it looks like a domain, add https://
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return "https://" + trimmed;
  return trimmed;
}


/* =========================================================
   6. NAVIGATION (hash routing)
   ========================================================= */
const VIEWS = ["home", "invoice", "quote", "qr", "card"];

function showView(name) {
  if (!VIEWS.includes(name)) name = "home";

  // Toggle sections
  $$(".view").forEach((v) => {
    v.classList.toggle("is-active", v.dataset.view === name);
  });

  // Toggle nav links
  $$(".nav-link").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.route === name);
  });

  // Scroll to top of the view
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Notify other scripts (invoice.js, quote.js, etc.)
  document.dispatchEvent(new CustomEvent("view:change", { detail: { view: name } }));
}

function currentRoute() {
  const hash = (window.location.hash || "").replace("#", "").trim();
  return VIEWS.includes(hash) ? hash : "home";
}

function initRouter() {
  window.addEventListener("hashchange", () => showView(currentRoute()));
  showView(currentRoute());
}


/* =========================================================
   7. FOOTER YEAR
   ========================================================= */
function setYear() {
  const el = $("#year");
  if (el) el.textContent = new Date().getFullYear();
}


/* =========================================================
   8. DEBOUNCE HELPER
   (used to avoid recalculating on every keystroke)
   ========================================================= */
function debounce(fn, wait = 120) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}


/* =========================================================
   9. BOOT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  setYear();
  initRouter();
});