/* =========================================================
   card.js — Digital Business Card Generator
   Sections:
   1.  DOM references
   2.  Helpers (initials, sanitizing)
   3.  Read form data
   4.  vCard builder (for QR + .vcf download)
   5.  Live preview render
   6.  QR inside the card
   7.  Print
   8.  Download .vcf
   9.  Reset
   10. Boot
   ========================================================= */


/* =========================================================
   1. DOM REFERENCES
   ========================================================= */
const cardForm        = $("#cardForm");
const cardPreview     = $("#cardPreview");
const resetCardBtn    = $("#resetCardBtn");
const printCardBtn    = $("#printCardBtn");
const downloadVcardBtn = $("#downloadVcardBtn");

const cardInputs = [
  "#cardName", "#cardProfession", "#cardBio",
  "#cardPhone", "#cardEmail", "#cardWebsite",
  "#cardLinkedin", "#cardGithub", "#cardInstagram",
  "#cardAccent"
];


/* =========================================================
   2. HELPERS
   ========================================================= */
function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Escape for use inside a vCard value
function vcardSafe(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}


/* =========================================================
   3. READ FORM DATA
   ========================================================= */
function readCardData() {
  return {
    name:       $("#cardName")?.value.trim()       || "",
    profession: $("#cardProfession")?.value.trim() || "",
    bio:        $("#cardBio")?.value.trim()        || "",
    phone:      $("#cardPhone")?.value.trim()      || "",
    email:      $("#cardEmail")?.value.trim()      || "",
    website:    $("#cardWebsite")?.value.trim()    || "",
    linkedin:   $("#cardLinkedin")?.value.trim()   || "",
    github:     $("#cardGithub")?.value.trim()     || "",
    instagram:  $("#cardInstagram")?.value.trim()  || "",
    accent:     $("#cardAccent")?.value            || "#4f46e5"
  };
}


/* =========================================================
   4. VCARD BUILDER
   ========================================================= */
function buildVCard(d) {
  const name = d.name || "Your Name";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcardSafe(name)};;;;`,
    `FN:${vcardSafe(name)}`,
    d.profession ? `TITLE:${vcardSafe(d.profession)}` : "",
    d.phone      ? `TEL;TYPE=CELL:${vcardSafe(d.phone)}` : "",
    d.email      ? `EMAIL;TYPE=INTERNET:${vcardSafe(d.email)}` : "",
    d.website    ? `URL:${vcardSafe(safeUrl(d.website))}` : "",
    d.linkedin   ? `X-SOCIALPROFILE;TYPE=linkedin:${vcardSafe(safeUrl(d.linkedin))}` : "",
    d.github     ? `X-SOCIALPROFILE;TYPE=github:${vcardSafe(safeUrl(d.github))}` : "",
    d.instagram  ? `X-SOCIALPROFILE;TYPE=instagram:${vcardSafe(safeUrl(d.instagram))}` : "",
    d.bio        ? `NOTE:${vcardSafe(d.bio)}` : "",
    "END:VCARD"
  ].filter(Boolean);

  return lines.join("\r\n");
}


/* =========================================================
   5. LIVE PREVIEW RENDER
   ========================================================= */
function renderCard() {
  if (!cardPreview) return;

  const d = readCardData();
  const initials = getInitials(d.name || "Your Name");

  const displayName       = d.name       || "Your Name";
  const displayProfession = d.profession || "Freelancer";
  const displayBio        = d.bio        || "Add a short bio to introduce yourself.";

  // Contact rows (only show filled ones)
  const contactRows = [];
  if (d.phone) {
    contactRows.push(`
      <a href="tel:${escapeHtml(d.phone.replace(/[^\d+]/g, ""))}">
        <span class="ico">📞</span>
        <span>${escapeHtml(d.phone)}</span>
      </a>`);
  }
  if (d.email) {
    contactRows.push(`
      <a href="mailto:${escapeHtml(d.email)}">
        <span class="ico">✉️</span>
        <span>${escapeHtml(d.email)}</span>
      </a>`);
  }
  if (d.website) {
    contactRows.push(`
      <a href="${escapeHtml(safeUrl(d.website))}" target="_blank" rel="noopener">
        <span class="ico">🌐</span>
        <span>${escapeHtml(d.website)}</span>
      </a>`);
  }
  const contactHtml = contactRows.length
    ? `<div class="contact-list">${contactRows.join("")}</div>`
    : "";

  // Socials (only show filled ones)
  const socials = [];
  if (d.linkedin)  socials.push(`<a href="${escapeHtml(safeUrl(d.linkedin))}"  target="_blank" rel="noopener">LinkedIn</a>`);
  if (d.github)    socials.push(`<a href="${escapeHtml(safeUrl(d.github))}"    target="_blank" rel="noopener">GitHub</a>`);
  if (d.instagram) socials.push(`<a href="${escapeHtml(safeUrl(d.instagram))}" target="_blank" rel="noopener">Instagram</a>`);
  const socialsHtml = socials.length
    ? `<div class="socials">${socials.join("")}</div>`
    : "";

  cardPreview.innerHTML = `
    <div class="bizcard" style="--card-accent:${escapeHtml(d.accent)};">
      <div class="avatar">${escapeHtml(initials)}</div>

      <h3>${escapeHtml(displayName)}</h3>
      <div class="role">${escapeHtml(displayProfession)}</div>
      <p class="bio">${escapeHtml(displayBio)}</p>

      ${contactHtml}
      ${socialsHtml}

      <div class="qr-row">
        <canvas id="cardQrCanvas" width="200" height="200"></canvas>
        <p>Scan to save my contact details.</p>
      </div>
    </div>
  `;

  drawCardQr(buildVCard(d));
}


/* =========================================================
   6. QR INSIDE THE CARD
   ========================================================= */
async function drawCardQr(vcardText) {
  const canvas = $("#cardQrCanvas");
  if (!canvas) return;

  if (typeof QRCode === "undefined") return; // library not available

  try {
    await QRCode.toCanvas(canvas, vcardText, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" }
    });
  } catch (err) {
    // If the vCard is too large to encode, fall back to a plain URL or message
    console.warn("Could not encode vCard in QR:", err);
    try {
      const d = readCardData();
      const fallback = d.website ? safeUrl(d.website) : (d.email ? "mailto:" + d.email : d.name);
      await QRCode.toCanvas(canvas, fallback || "FreelanceOS", { width: 200, margin: 1 });
    } catch (err2) {
      console.error("QR fallback also failed:", err2);
    }
  }
}

const renderCardDebounced = debounce(renderCard, 120);


/* =========================================================
   7. PRINT
   ========================================================= */
function printCard() {
  window.print();
}


/* =========================================================
   8. DOWNLOAD .VCF
   ========================================================= */
function downloadVCard() {
  const d = readCardData();

  if (!d.name) {
    toast("Please enter a name first", "error");
    return;
  }

  const vcard = buildVCard(d);

  // Safe filename
  const safeName = d.name.replace(/[^\w\-]+/g, "_").toLowerCase();
  const filename = `${safeName || "contact"}.vcf`;

  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Free the object URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast("Contact file downloaded", "success");
}


/* =========================================================
   9. RESET
   ========================================================= */
function resetCard() {
  if (!cardForm) return;
  if (!confirm("Clear all card fields?")) return;

  cardForm.reset();
  $("#cardAccent").value = "#4f46e5";

  renderCard();
  toast("Card cleared", "info");
}


/* =========================================================
   10. BOOT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (!cardForm || !cardPreview) return;

  // Live updates on any field
  cardForm.addEventListener("input",  renderCardDebounced);
  cardForm.addEventListener("change", renderCard);

  // Toolbar
  printCardBtn?.addEventListener("click", printCard);
  downloadVcardBtn?.addEventListener("click", downloadVCard);
  resetCardBtn?.addEventListener("click", resetCard);

  // First paint (so the empty state shows a nice placeholder card)
  renderCard();
});