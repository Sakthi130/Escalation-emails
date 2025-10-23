// === CONFIGURATION ===
const CSV_INTERNAL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPVg1SHavBi-x057E5EurZKxohmfAtQx7EXvcK509VHQF6zzjDr3JjbJLH7lH2Sugo9jd61F0PI2jl/pub?gid=1394291922&single=true&output=csv";
const CSV_FORM = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPVg1SHavBi-x057E5EurZKxohmfAtQx7EXvcK509VHQF6zzjDr3JjbJLH7lH2Sugo9jd61F0PI2jl/pub?gid=88127589&single=true&output=csv";
const CSV_CLOSE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPVg1SHavBi-x057E5EurZKxohmfAtQx7EXvcK509VHQF6zzjDr3JjbJLH7lH2Sugo9jd61F0PI2jl/pub?gid=1713040682&single=true&output=csv";

// Google Form URLs
const FORM_INPROGRESS = "https://forms.gle/kZpcF9oGzkyaqZAn8";
const FORM_CLOSURE = "https://forms.gle/2SKJFFmus6c77rqm6";

// Global state
let emails = [], forms = [], closures = [];
let currentView = "main";

// === LOAD ALL SHEETS ===
async function loadCSVs() {
  try {
    emails = await fetchCSV(CSV_INTERNAL);
    forms = await fetchCSV(CSV_FORM);
    closures = await fetchCSV(CSV_CLOSE);
    renderCounters();
  } catch (err) {
    console.error("Error loading CSVs:", err);
  }
}

function fetchCSV(url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: (res) => {
        const rows = res.data.filter(r => r.msgid || r.threadid);
        resolve(rows);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        resolve([]);
      }
    });
  });
}

// === LOGIC HELPERS ===
function isInProgress(msgId) {
  return forms.some(f => f.msgid && f.msgid.trim() === msgId.trim());
}

function isClosed(threadId, msgDate) {
  const closure = closures.find(c => c.threadid && c.threadid.trim() === threadId.trim());
  if (!closure) return false;

  const closeTime = new Date(closure.Timestamp || closure.timestamp || closure["Timestamp"]);
  if (isNaN(closeTime)) return false;
  return msgDate < closeTime;
}

// === RENDER COUNTERS ===
function renderCounters() {
  const openEmails = emails.filter(e => {
    const date = new Date(e.date || e.Date);
    return !isInProgress(e.msgid) && !isClosed(e.threadid, date);
  });

  const progressEmails = emails.filter(e => {
    const date = new Date(e.date || e.Date);
    return isInProgress(e.msgid) && !isClosed(e.threadid, date);
  });

  document.getElementById("openCount").innerText = openEmails.length;
  document.getElementById("progressCount").innerText = progressEmails.length;

  document.getElementById("openCard").onclick = () =>
    showTable("open", openEmails);
  document.getElementById("progressCard").onclick = () =>
    showTable("progress", progressEmails);
}

// === SHOW TABLE ===
function showTable(view, data) {
  currentView = view;
  document.getElementById("counters").classList.add("hidden");
  document.getElementById("tableSection").classList.remove("hidden");
  const tbody = document.querySelector("#emailTable tbody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No ${view === "open" ? "open" : "in-progress"} emails found.</td></tr>`;
    return;
  }

  data.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date || e.Date || "-"}</td>
      <td>${e.from || e.From || "-"}</td>
      <td>${e.subject || e.Subject || "-"}</td>
      <td>${e.threadid || e.threadId || "-"}</td>
      <td>
        ${
          view === "open"
            ? `<button onclick="window.open('${FORM_INPROGRESS}', '_blank')">Mark In-Progress</button>`
            : `<button onclick="window.open('${FORM_CLOSURE}', '_blank')">Close Thread</button>`
        }
      </td>`;
    tbody.appendChild(tr);
  });
}

// === BACK BUTTON ===
document.getElementById("backBtn").onclick = () => {
  document.getElementById("tableSection").classList.add("hidden");
  document.getElementById("counters").classList.remove("hidden");
};

// === AUTO REFRESH EVERY 1 HOUR ===
loadCSVs();
setInterval(loadCSVs, 60 * 60 * 1000);
