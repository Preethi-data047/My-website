/* =========================================================
   quote.js — Quote / Price Calculator logic
   Sections:
   1.  Configuration (prices — edit these to your rates)
   2.  DOM references
   3.  Build form options (selects + checkboxes)
   4.  Read form data
   5.  Calculation
   6.  Live preview render
   7.  Print
   8.  Reset
   9.  Boot
   ========================================================= */


/* =========================================================
   1. CONFIGURATION
   ---------------------------------------------------------
   👉 THIS IS THE ONLY PART YOU NEED TO EDIT TO CHANGE PRICES.
   All amounts are in INR. Change the numbers to match your
   own freelance rates.
   ========================================================= */
const QUOTE_CONFIG = {

  currency: "INR",

  // Base price by website type
  types: [
    { value: "landing",   label: "Landing page",         base: 8000  },
    { value: "business",  label: "Business website",     base: 18000 },
    { value: "ecommerce", label: "E-commerce store",     base: 35000 },
    { value: "webapp",    label: "Web application",      base: 60000 },
    { value: "blog",      label: "Blog / Portfolio",     base: 10000 }
  ],

  // Price per page (multiplied by page count)
  pricePerPage: 1200,

  // Design complexity multiplier
  design: [
    { value: "simple",  label: "Simple (template-based)",       multiplier: 1.0  },
    { value: "custom",  label: "Custom design",                 multiplier: 1.25 },
    { value: "premium", label: "Premium / animated design",     multiplier: 1.6  }
  ],

  // Delivery speed multiplier (faster = more expensive)
  speed: [
    { value: "relaxed", label: "Relaxed (4–6 weeks)",  multiplier: 1.0,  days: 35 },
    { value: "normal",  label: "Normal (2–3 weeks)",   multiplier: 1.15, days: 18 },
    { value: "fast",    label: "Fast (1–2 weeks)",     multiplier: 1.35, days: 10 },
    { value: "rush",    label: "Rush (3–5 days)",      multiplier: 1.7,  days: 5  }
  ],

  // Optional features (flat add-ons)
  features: [
    { value: "responsive", label: "Mobile responsive",        price: 2000 },
    { value: "seo",        label: "SEO setup",                price: 4000 },
    { value: "cms",        label: "CMS (edit content yourself)", price: 5000 },
    { value: "blog",       label: "Blog module",              price: 3500 },
    { value: "payments",   label: "Payment gateway",          price: 6000 },
    { value: "auth",       label: "Login / user accounts",    price: 8000 },
    { value: "dashboard",  label: "Admin dashboard",          price: 9000 },
    { value: "analytics",  label: "Analytics integration",    price: 1500 }
  ],

  // Additional services
  addons: [
    { value: "content",   label: "Content writing",           price: 5000 },
    { value: "logo",      label: "Logo design",               price: 4000 },
    { value: "hosting",   label: "Hosting setup",             price: 2500 },
    { value: "maintenance", label: "3 months maintenance",    price: 6000 },
    { value: "training",  label: "Client training session",   price: 3000 },
    { value: "copy",      label: "Copywriting",               price: 3500 }
  ]
};


/* =========================================================
   2. DOM REFERENCES
   ========================================================= */
const quoteForm        = $("#quoteForm");
const quotePreview     = $("#quotePreview");
const featuresBox      = $("#featuresBox");
const addonsBox        = $("#addonsBox");
const resetQuoteBtn    = $("#resetQuoteBtn");
const printQuoteBtn    = $("#printQuoteBtn");


/* =========================================================
   3. BUILD FORM OPTIONS
   ========================================================= */
function fillSelect(selectEl, options, selectedValue) {
  if (!selectEl) return;
  selectEl.innerHTML = options
    .map(
      (opt) =>
        `<option value="${opt.value}" ${
          opt.value === selectedValue ? "selected" : ""
        }>${escapeHtml(opt.label)}</option>`
    )
    .join("");
}

function buildCheckboxes(container, items) {
  if (!container) return;
  container.innerHTML = items
    .map(
      (item) => `
      <label class="check-item">
        <input type="checkbox" value="${item.value}" data-price="${item.price}" />
        <span>
          ${escapeHtml(item.label)}
          <span class="price-tag">+ ${formatMoney(item.price, QUOTE_CONFIG.currency)}</span>
        </span>
      </label>`
    )
    .join("");
}

function buildQuoteForm() {
  fillSelect($("#qType"),   QUOTE_CONFIG.types,  "business");
  fillSelect($("#qDesign"), QUOTE_CONFIG.design, "custom");
  fillSelect($("#qSpeed"),  QUOTE_CONFIG.speed,  "normal");

  buildCheckboxes(featuresBox, QUOTE_CONFIG.features);
  buildCheckboxes(addonsBox,   QUOTE_CONFIG.addons);
}


/* =========================================================
   4. READ FORM DATA
   ========================================================= */
function readQuoteForm() {
  const checkedValues = (container) =>
    container
      ? $$("input[type=checkbox]:checked", container).map((c) => ({
          value: c.value,
          price: toNumber(c.dataset.price)
        }))
      : [];

  return {
    from:         $("#qFrom")?.value.trim()   || "Your Studio",
    client:       $("#qClient")?.value.trim() || "Client",
    title:        $("#qTitle")?.value.trim()  || "Website project",

    type:         QUOTE_CONFIG.types.find((t) => t.value === $("#qType")?.value)   || QUOTE_CONFIG.types[0],
    design:       QUOTE_CONFIG.design.find((d) => d.value === $("#qDesign")?.value) || QUOTE_CONFIG.design[0],
    speed:        QUOTE_CONFIG.speed.find((s) => s.value === $("#qSpeed")?.value)  || QUOTE_CONFIG.speed[0],

    pages:        Math.max(1, toNumber($("#qPages")?.value) || 1),
    taxPct:       toNumber($("#qTax")?.value),

    features:     checkedValues(featuresBox),
    addons:       checkedValues(addonsBox)
  };
}


/* =========================================================
   5. CALCULATION
   ========================================================= */
function calculateQuote() {
  const d = readQuoteForm();

  // Base + per-page
  const basePrice  = d.type.base;
  const pagesCost  = d.pages * QUOTE_CONFIG.pricePerPage;
  let   subtotal   = basePrice + pagesCost;

  // Design + speed multipliers
  subtotal *= d.design.multiplier;
  subtotal *= d.speed.multiplier;

  // Features + addons
  const featuresTotal = d.features.reduce((sum, f) => sum + f.price, 0);
  const addonsTotal   = d.addons.reduce((sum, a) => sum + a.price, 0);

  subtotal += featuresTotal + addonsTotal;

  subtotal = round2(subtotal);

  const tax   = round2(subtotal * (d.taxPct / 100));
  const total = round2(subtotal + tax);

  return {
    data: d,
    basePrice,
    pagesCost,
    featuresTotal,
    addonsTotal,
    subtotal,
    tax,
    total,
    deliveryDays: d.speed.days
  };
}


/* =========================================================
   6. LIVE PREVIEW RENDER
   ========================================================= */
function renderQuotePreview() {
  if (!quotePreview) return;

  const q = calculateQuote();
  const d = q.data;
  const currency = QUOTE_CONFIG.currency;

  // Build feature / addon list HTML
  const featureLines = d.features.length
    ? d.features.map((f) => `<li>${escapeHtml(
        QUOTE_CONFIG.features.find((x) => x.value === f.value)?.label || f.value
      )} — ${formatMoney(f.price, currency)}</li>`).join("")
    : "<li class='muted'>None selected</li>";

  const addonLines = d.addons.length
    ? d.addons.map((a) => `<li>${escapeHtml(
        QUOTE_CONFIG.addons.find((x) => x.value === a.value)?.label || a.value
      )} — ${formatMoney(a.price, currency)}</li>`).join("")
    : "<li class='muted'>None selected</li>";

  const quoteNo = "QT-" + String(Date.now()).slice(-5);

  quotePreview.innerHTML = `
    <div class="doc-head">
      <div class="doc-brand">
        <h2>${escapeHtml(d.from)}</h2>
        <p>Project quotation</p>
      </div>
      <div class="doc-meta">
        <div class="doc-title">QUOTE</div>
        <div><strong>#</strong> ${quoteNo}</div>
        <div><strong>Date:</strong> ${formatDateHuman(todayISO())}</div>
        <div><strong>Valid for:</strong> 30 days</div>
      </div>
    </div>

    <div class="doc-grid">
      <div>
        <h5>Prepared for</h5>
        <p><strong>${escapeHtml(d.client)}</strong></p>
      </div>
      <div>
        <h5>Project</h5>
        <p>${escapeHtml(d.title)}</p>
      </div>
    </div>

    <table class="doc-items">
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(d.type.label)} — base price</td>
          <td class="num">${formatMoney(q.basePrice, currency)}</td>
        </tr>
        <tr>
          <td>${d.pages} page${d.pages > 1 ? "s" : ""} × ${formatMoney(QUOTE_CONFIG.pricePerPage, currency)}</td>
          <td class="num">${formatMoney(q.pagesCost, currency)}</td>
        </tr>
        <tr>
          <td>Design: ${escapeHtml(d.design.label)} <span class="muted">(×${d.design.multiplier})</span></td>
          <td class="num">—</td>
        </tr>
        <tr>
          <td>Delivery: ${escapeHtml(d.speed.label)} <span class="muted">(×${d.speed.multiplier})</span></td>
          <td class="num">—</td>
        </tr>
        ${d.features.length ? `<tr><td colspan="2" style="padding-top:14px;"><strong>Features</strong></td></tr>` : ""}
        ${d.features
          .map((f) => {
            const label = QUOTE_CONFIG.features.find((x) => x.value === f.value)?.label || f.value;
            return `<tr><td style="padding-left:24px;">${escapeHtml(label)}</td><td class="num">${formatMoney(f.price, currency)}</td></tr>`;
          })
          .join("")}
        ${d.addons.length ? `<tr><td colspan="2" style="padding-top:14px;"><strong>Additional services</strong></td></tr>` : ""}
        ${d.addons
          .map((a) => {
            const label = QUOTE_CONFIG.addons.find((x) => x.value === a.value)?.label || a.value;
            return `<tr><td style="padding-left:24px;">${escapeHtml(label)}</td><td class="num">${formatMoney(a.price, currency)}</td></tr>`;
          })
          .join("")}
      </tbody>
    </table>

    <div class="doc-totals">
      <div class="row"><span>Subtotal</span><span>${formatMoney(q.subtotal, currency)}</span></div>
      <div class="row"><span>Tax (${d.taxPct}%)</span><span>${formatMoney(q.tax, currency)}</span></div>
      <div class="row grand"><span>Estimated total</span><span>${formatMoney(q.total, currency)}</span></div>
    </div>

    <div class="doc-notes">
      <strong>Estimated delivery:</strong> ${q.deliveryDays} days after project kickoff.<br>
      This quote is an estimate. Final price may vary based on requirements.
    </div>
  `;
}

const recalculateQuote = debounce(renderQuotePreview, 80);


/* =========================================================
   7. PRINT
   ========================================================= */
function printQuote() {
  window.print();
}


/* =========================================================
   8. RESET
   ========================================================= */
function resetQuote() {
  if (!quoteForm) return;
  if (!confirm("Reset the quote form?")) return;

  quoteForm.reset();

  $("#qPages").value = 5;
  $("#qTax").value   = 18;

  // Re-check nothing
  $$("input[type=checkbox]", quoteForm).forEach((c) => (c.checked = false));

  renderQuotePreview();
  toast("Quote reset", "info");
}


/* =========================================================
   9. BOOT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!quoteForm) return;

  buildQuoteForm();

  // Live updates on any change
  quoteForm.addEventListener("input",  recalculateQuote);
  quoteForm.addEventListener("change", recalculateQuote);

  printQuoteBtn?.addEventListener("click", printQuote);
  resetQuoteBtn?.addEventListener("click", resetQuote);

  renderQuotePreview();
});