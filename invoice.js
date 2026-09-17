/* =========================================================
   invoice.js — Invoice Generator logic
   Sections:
   1.  State
   2.  DOM references
   3.  Item rows (add / remove / read)
   4.  Calculations
   5.  Live preview render
   6.  Print
   7.  Save / Load draft (localStorage)
   8.  Reset
   9.  Boot
   ========================================================= */


/* =========================================================
   1. STATE
   ========================================================= */
const invoiceState = {
  currency: "INR"
};


/* =========================================================
   2. DOM REFERENCES
   ========================================================= */
const invoiceForm      = $("#invoiceForm");
const itemsBody        = $("#itemsBody");
const itemRowTemplate  = $("#itemRowTemplate");
const invoicePreview   = $("#invoicePreview");

const addItemBtn       = $("#addItemBtn");
const printInvoiceBtn  = $("#printInvoiceBtn");
const saveInvoiceBtn   = $("#saveInvoiceBtn");
const loadInvoiceBtn   = $("#loadInvoiceBtn");
const resetInvoiceBtn  = $("#resetInvoiceBtn");


/* =========================================================
   3. ITEM ROWS
   ========================================================= */
function addItemRow(data = { desc: "", qty: 1, price: 0 }) {
  if (!itemRowTemplate || !itemsBody) return;

  const clone = itemRowTemplate.content.cloneNode(true);
  const row   = clone.querySelector(".item-row");

  row.querySelector(".item-desc").value  = data.desc;
  row.querySelector(".item-qty").value   = data.qty;
  row.querySelector(".item-price").value = data.price;

  itemsBody.appendChild(clone);
  recalculateInvoice();
}

function removeItemRow(btn) {
  const row = btn.closest(".item-row");
  if (!row) return;

  // Keep at least one row
  if (itemsBody.querySelectorAll(".item-row").length <= 1) {
    row.querySelector(".item-desc").value  = "";
    row.querySelector(".item-qty").value   = 1;
    row.querySelector(".item-price").value = 0;
  } else {
    row.remove();
  }

  recalculateInvoice();
}

function readItems() {
  const rows = $$(".item-row", itemsBody);
  return rows.map((row) => ({
    desc:  row.querySelector(".item-desc").value.trim(),
    qty:   toNumber(row.querySelector(".item-qty").value),
    price: toNumber(row.querySelector(".item-price").value)
  }));
}


/* =========================================================
   4. CALCULATIONS
   ========================================================= */
function calculateInvoice() {
  const items        = readItems();
  const discountPct  = toNumber($("#discount")?.value);
  const taxPct       = toNumber($("#tax")?.value);

  let subtotal = 0;
  const lineTotals = items.map((it) => {
    const line = round2(it.qty * it.price);
    subtotal += line;
    return line;
  });

  subtotal        = round2(subtotal);
  const discount  = round2(subtotal * (discountPct / 100));
  const taxable   = round2(subtotal - discount);
  const tax       = round2(taxable * (taxPct / 100));
  const grand     = round2(taxable + tax);

  return {
    items,
    lineTotals,
    discountPct,
    taxPct,
    subtotal,
    discount,
    taxable,
    tax,
    grand
  };
}


/* =========================================================
   5. LIVE PREVIEW RENDER
   ========================================================= */
function renderInvoicePreview() {
  if (!invoicePreview) return;

  const data     = calculateInvoice();
  const currency = invoiceState.currency;

  // ---------- Update the small totals box in the form ----------
  const subEl   = $("#sumSubtotal");
  const disEl   = $("#sumDiscount");
  const taxEl   = $("#sumTax");
  const totEl   = $("#sumTotal");

  if (subEl) subEl.textContent = formatMoney(data.subtotal, currency);
  if (disEl) disEl.textContent = "− " + formatMoney(data.discount, currency);
  if (taxEl) taxEl.textContent = formatMoney(data.tax, currency);
  if (totEl) totEl.textContent = formatMoney(data.grand, currency);

  // ---------- Update each line total in the table ----------
  const lineCells = $$(".item-line-total", itemsBody);
  lineCells.forEach((cell, i) => {
    cell.textContent = formatMoney(data.lineTotals[i], currency);
  });

  // ---------- Build the paper preview ----------
  const bizName     = $("#bizName")?.value.trim()      || "Your Business";
  const bizPhone    = $("#bizPhone")?.value.trim()     || "";
  const bizEmail    = $("#bizEmail")?.value.trim()     || "";
  const bizAddress  = $("#bizAddress")?.value.trim()   || "";

  const clientName  = $("#clientName")?.value.trim()   || "Customer";
  const clientPhone = $("#clientPhone")?.value.trim()  || "";
  const clientEmail = $("#clientEmail")?.value.trim()  || "";

  const invoiceNo   = $("#invoiceNo")?.value.trim()    || "INV-0001";
  const invoiceDate = $("#invoiceDate")?.value         || todayISO();
  const dueDate     = $("#dueDate")?.value             || "";
  const notes       = $("#notes")?.value               || "";

  const itemsHtml = data.items
    .map((it, i) => {
      const desc = escapeHtml(it.desc || "—");
      return `
        <tr>
          <td>${desc}</td>
          <td class="num">${it.qty}</td>
          <td class="num">${formatMoney(it.price, currency)}</td>
          <td class="num">${formatMoney(data.lineTotals[i], currency)}</td>
        </tr>`;
    })
    .join("");

  invoicePreview.innerHTML = `
    <div class="doc-head">
      <div class="doc-brand">
        <h2>${escapeHtml(bizName)}</h2>
        <p>
          ${bizPhone ? escapeHtml(bizPhone) + "<br>" : ""}
          ${bizEmail ? escapeHtml(bizEmail) + "<br>" : ""}
          ${bizAddress ? escapeHtml(bizAddress) : ""}
        </p>
      </div>

      <div class="doc-meta">
        <div class="doc-title">INVOICE</div>
        <div><strong>#</strong> ${escapeHtml(invoiceNo)}</div>
        <div><strong>Date:</strong> ${formatDateHuman(invoiceDate)}</div>
        ${dueDate ? `<div><strong>Due:</strong> ${formatDateHuman(dueDate)}</div>` : ""}
      </div>
    </div>

    <div class="doc-grid">
      <div>
        <h5>Billed to</h5>
        <p><strong>${escapeHtml(clientName)}</strong></p>
        ${clientPhone ? `<p>${escapeHtml(clientPhone)}</p>` : ""}
        ${clientEmail ? `<p>${escapeHtml(clientEmail)}</p>` : ""}
      </div>
      <div>
        <h5>Payment terms</h5>
        <p>Due on receipt${dueDate ? " — " + formatDateHuman(dueDate) : ""}</p>
      </div>
    </div>

    <table class="doc-items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:20px;">No items added yet</td></tr>`}
      </tbody>
    </table>

    <div class="doc-totals">
      <div class="row"><span>Subtotal</span><span>${formatMoney(data.subtotal, currency)}</span></div>
      ${data.discountPct > 0
        ? `<div class="row"><span>Discount (${data.discountPct}%)</span><span>− ${formatMoney(data.discount, currency)}</span></div>`
        : ""}
      <div class="row"><span>Tax (${data.taxPct}%)</span><span>${formatMoney(data.tax, currency)}</span></div>
      <div class="row grand"><span>Grand total</span><span>${formatMoney(data.grand, currency)}</span></div>
    </div>

    ${notes ? `<div class="doc-notes">${escapeHtml(notes)}</div>` : ""}
  `;
}

const recalculateInvoice = debounce(renderInvoicePreview, 80);


/* =========================================================
   6. PRINT
   ========================================================= */
function printInvoice() {
  if (!invoicePreview) return;
  window.print();
}


/* =========================================================
   7. SAVE / LOAD DRAFT (localStorage)
   ========================================================= */
const INVOICE_KEY = "freelanceos.invoice.draft";

function saveInvoiceDraft() {
  const draft = {
    bizName:     $("#bizName")?.value || "",
    bizPhone:    $("#bizPhone")?.value || "",
    bizEmail:    $("#bizEmail")?.value || "",
    bizAddress:  $("#bizAddress")?.value || "",
    clientName:  $("#clientName")?.value || "",
    clientPhone: $("#clientPhone")?.value || "",
    clientEmail: $("#clientEmail")?.value || "",
    invoiceNo:   $("#invoiceNo")?.value || "",
    currency:    $("#currency")?.value || "INR",
    invoiceDate: $("#invoiceDate")?.value || "",
    dueDate:     $("#dueDate")?.value || "",
    discount:    $("#discount")?.value || "0",
    tax:         $("#tax")?.value || "18",
    notes:       $("#notes")?.value || "",
    items:       readItems()
  };

  try {
    localStorage.setItem(INVOICE_KEY, JSON.stringify(draft));
    toast("Invoice draft saved", "success");
  } catch (e) {
    toast("Could not save draft", "error");
  }
}

function loadInvoiceDraft(silent = false) {
  let raw;
  try {
    raw = localStorage.getItem(INVOICE_KEY);
  } catch (e) { raw = null; }

  if (!raw) {
    if (!silent) toast("No saved draft found", "info");
    return;
  }

  let d;
  try { d = JSON.parse(raw); }
  catch (e) { toast("Draft is corrupted", "error"); return; }

  $("#bizName").value      = d.bizName || "";
  $("#bizPhone").value     = d.bizPhone || "";
  $("#bizEmail").value     = d.bizEmail || "";
  $("#bizAddress").value   = d.bizAddress || "";
  $("#clientName").value   = d.clientName || "";
  $("#clientPhone").value  = d.clientPhone || "";
  $("#clientEmail").value  = d.clientEmail || "";
  $("#invoiceNo").value    = d.invoiceNo || "";
  $("#currency").value     = d.currency || "INR";
  $("#invoiceDate").value  = d.invoiceDate || todayISO();
  $("#dueDate").value      = d.dueDate || "";
  $("#discount").value     = d.discount || "0";
  $("#tax").value          = d.tax || "18";
  $("#notes").value        = d.notes || "";

  invoiceState.currency    = $("#currency").value;

  // Rebuild item rows
  itemsBody.innerHTML = "";
  const items = Array.isArray(d.items) && d.items.length ? d.items : [{ desc: "", qty: 1, price: 0 }];
  items.forEach((it) => addItemRow(it));

  renderInvoicePreview();
  if (!silent) toast("Draft loaded", "success");
}


/* =========================================================
   8. RESET
   ========================================================= */
function resetInvoice() {
  if (!invoiceForm) return;
  if (!confirm("Clear all invoice fields?")) return;

  invoiceForm.reset();

  $("#invoiceNo").value    = "INV-" + String(Date.now()).slice(-4);
  $("#invoiceDate").value  = todayISO();
  $("#dueDate").value      = addDaysISO(todayISO(), 14);
  $("#currency").value     = "INR";
  invoiceState.currency    = "INR";

  itemsBody.innerHTML = "";
  addItemRow({ desc: "", qty: 1, price: 0 });

  renderInvoicePreview();
  toast("Invoice cleared", "info");
}


/* =========================================================
   9. BOOT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!invoiceForm) return;

  // Default values
  $("#invoiceNo").value   = "INV-" + String(Date.now()).slice(-4);
  $("#invoiceDate").value = todayISO();
  $("#dueDate").value     = addDaysISO(todayISO(), 14);

  // Start with one blank item row
  addItemRow({ desc: "", qty: 1, price: 0 });

  // Live updates on any input inside the form
  invoiceForm.addEventListener("input", recalculateInvoice);
  invoiceForm.addEventListener("change", (e) => {
    if (e.target.id === "currency") {
      invoiceState.currency = e.target.value;
    }
    recalculateInvoice();
  });

  // Add / remove items (event delegation — works for future rows too)
  addItemBtn?.addEventListener("click", () => addItemRow({ desc: "", qty: 1, price: 0 }));
  itemsBody?.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-item");
    if (btn) removeItemRow(btn);
  });

  // Toolbar buttons
  printInvoiceBtn?.addEventListener("click", printInvoice);
  saveInvoiceBtn?.addEventListener("click", saveInvoiceDraft);
  loadInvoiceBtn?.addEventListener("click", () => loadInvoiceDraft(false));
  resetInvoiceBtn?.addEventListener("click", resetInvoice);

  // First paint
  renderInvoicePreview();
});