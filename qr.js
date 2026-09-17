/* =========================================================
   qr.js — QR Code Generator
   Uses the qrcode.js library loaded from CDN in index.html
   Sections:
   1.  DOM references
   2.  Content builder (URL / Text / Phone / Email)
   3.  Label + placeholder sync
   4.  Generate QR
   5.  Download PNG
   6.  Reset state
   7.  Boot
   ========================================================= */


/* =========================================================
   1. DOM REFERENCES
   ========================================================= */
const qrDataInput    = $("#qrData");
const qrDataLabel    = $("#qrDataLabel");
const qrSizeSelect   = $("#qrSize");
const qrDarkInput    = $("#qrDark");
const qrLightInput   = $("#qrLight");
const qrCanvas       = $("#qrCanvas");
const qrEmptyState   = $("#qrEmpty");
const qrCaption      = $("#qrCaption");
const generateQrBtn  = $("#generateQrBtn");
const downloadQrBtn  = $("#downloadQrBtn");

let qrHasContent = false;   // becomes true once a QR code is drawn


/* =========================================================
   2. CONTENT BUILDER
   ========================================================= */
function getQrType() {
  const checked = $("input[name='qrType']:checked");
  return checked ? checked.value : "url";
}

function buildQrContent(type, raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  switch (type) {
    case "url":
      return safeUrl(value);
    case "phone":
      // Strip spaces and dashes, keep + and digits
      return "tel:" + value.replace(/[^\d+]/g, "");
    case "email":
      return "mailto:" + value;
    case "text":
    default:
      return value;
  }
}


/* =========================================================
   3. LABEL + PLACEHOLDER SYNC
   ========================================================= */
const QR_LABELS = {
  url:   { label: "Website URL",   placeholder: "https://example.com" },
  text:  { label: "Text",          placeholder: "Hello from FreelanceOS" },
  phone: { label: "Phone number",  placeholder: "+91 98765 43210" },
  email: { label: "Email address", placeholder: "hello@example.com" }
};

function syncQrLabels() {
  const type = getQrType();
  const info = QR_LABELS[type];
  if (qrDataLabel) qrDataLabel.textContent = info.label;
  if (qrDataInput) qrDataInput.placeholder = info.placeholder;
}

function clearQrOutput() {
  const ctx = qrCanvas.getContext("2d");
  ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
  qrCanvas.classList.remove("is-visible");
  qrEmptyState.style.display = "";
  qrCaption.textContent = "";
  downloadQrBtn.disabled = true;
  qrHasContent = false;
}


/* =========================================================
   4. GENERATE QR
   ========================================================= */
async function generateQr() {
  if (typeof QRCode === "undefined") {
    toast("QR library not loaded — check your internet connection", "error");
    return;
  }

  const type    = getQrType();
  const content = buildQrContent(type, qrDataInput.value);

  if (!content) {
    toast("Please enter something to encode", "error");
    clearQrOutput();
    return;
  }

  const size = parseInt(qrSizeSelect.value, 10) || 512;
  const dark = qrDarkInput.value || "#0f172a";
  const light = qrLightInput.value || "#ffffff";

  // Resize the canvas to the chosen size
  qrCanvas.width  = size;
  qrCanvas.height = size;

  const options = {
    width:  size,
    margin: 2,
    color: {
      dark:  dark,
      light: light
    }
  };

  try {
    await QRCode.toCanvas(qrCanvas, content, options);
    qrCanvas.classList.add("is-visible");
    qrEmptyState.style.display = "none";
    downloadQrBtn.disabled = false;
    qrHasContent = true;

    qrCaption.textContent = content;

    toast("QR code generated", "success");
  } catch (err) {
    console.error(err);
    toast("Could not generate QR code — content may be too long", "error");
    clearQrOutput();
  }
}


/* =========================================================
   5. DOWNLOAD PNG
   ========================================================= */
function downloadQr() {
  if (!qrHasContent) {
    toast("Generate a QR code first", "info");
    return;
  }

  try {
    // Convert the canvas to a PNG data URL
    const dataUrl = qrCanvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.download = `freelanceos-qr-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast("QR code downloaded", "success");
  } catch (err) {
    console.error(err);
    toast("Download failed", "error");
  }
}


/* =========================================================
   6. RESET
   ========================================================= */
function resetQr() {
  qrDataInput.value = "";
  qrSizeSelect.value = "512";
  qrDarkInput.value = "#0f172a";
  qrLightInput.value = "#ffffff";
  syncQrLabels();
  clearQrOutput();
}


/* =========================================================
   7. BOOT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!qrCanvas || !generateQrBtn) return;

  // Make sure the canvas starts hidden behind the empty state
  qrCanvas.classList.remove("is-visible");
  qrEmptyState.style.display = "";

  // Sync the label whenever the type changes
  $$("input[name='qrType']").forEach((radio) => {
    radio.addEventListener("change", () => {
      syncQrLabels();
      clearQrOutput();
    });
  });

  // Buttons
  generateQrBtn.addEventListener("click", generateQr);
  downloadQrBtn.addEventListener("click", downloadQr);

  // Regenerate when appearance changes (if we already have content)
  qrSizeSelect.addEventListener("change", () => { if (qrHasContent) generateQr(); });
  qrDarkInput.addEventListener("input",   () => { if (qrHasContent) generateQr(); });
  qrLightInput.addEventListener("input",  () => { if (qrHasContent) generateQr(); });

  // Nice touch: pressing Enter in the input generates too
  qrDataInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      generateQr();
    }
  });

  // Initial state
  syncQrLabels();
  clearQrOutput();
});