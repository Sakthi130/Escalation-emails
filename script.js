const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPVg1SHavBi-x057E5EurZKxohmfAtQx7EXvcK509VHQF6zzjDr3JjbJLH7lH2Sugo9jd61F0PI2jl/pub?output=csv";

// Form URLs
const FORM_INPROGRESS = "https://forms.gle/kZpcF9oGzkyaqZAn8";
const FORM_CLOSURE = "https://forms.gle/2SKJFFmus6c77rqm6";

// Sub-sheet CSV links
const CSV_INTERNAL = SHEET_BASE + "&sheet=Internal%20Emails";
const CSV_FORM = SHEET_BASE + "&sheet=Form%20responses%201";
const CSV_CLOSE = SHEET_BASE + "&sheet=Form%20responses%202";

let emails = [], forms = [], closures = [];
let currentView = "main";

// --- load all three sheets ---
async function loadCSVs() {
  emails = await fetchCSV(CSV_INTERNAL);
  forms = await fetchCSV(CSV_FORM);
  closures = await fetchCSV(CSV_CLOSE);
  renderCounters();
}

function fetchCSV(url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: (res) => resolve(res.data.filter(r => r.msgid || r.threadid))
    });
  });
}

// --- logic helpers ---
function isInProgress(msgId) {
  return forms.some(f => f.msgid === msgId);
}
function isClosed(threadId, msgDate) {
  const closure = closures.find(c => c.threadid === threadId);
  if (!closure) return false;
  const closeTime = new Date(closure.Timestamp || closure.timestamp || closure["Timestamp"]);
  return msgDate < closeTime;
}

// --- UI render ---
function renderCounters() {
  const openEmails = emails.filter(e => {
    const date = new Date(e.date);
    return !isInProgress(e.msgid) && !isClosed(e.threadid, date);
  });
  const progressEmails = emails.filter(e => {
    const date = new Date(e.date);
    return isInProgress(e.msgid) && !isClosed(e.threadid, date);
  });

  document.getElementById("openCount").innerText = openEmails.length;
  document.getElementById("progressCount").innerText = progressEmails.length;

  document.getElementById("openCard").onclick = () =>
    showTable("open", openEmails);
  document.getElementById("progressCard").onclick = () =>
    showTable("progress", progressEmails);
}

// --- table display ---
function showTable(view, data) {
  currentView = view;
  document.getElementById("counters").classList.add("hidden");
  document.getElementById("tableSection").classList.remove("hidden");
  const tbody = document.querySelector("#emailTable tbody");
  tbody.innerHTML = "";

  data.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.from}</td>
      <td>${e.subject}</td>
      <td>${e.threadid}</td>
      <td>
        ${
          view === "open"
            ? `<button onclick="window.open('${FORM_INPROGRESS}')">Mark In-Progress</button>`
            : `<button onclick="window.open('${FORM_CLOSURE}')">Close Thread</button>`
        }
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById("backBtn").onclick = () => {
  document.getElementById("tableSection").classList.add("hidden");
  document.getElementById("counters").classList.remove("hidden");
};

// auto refresh every hour
loadCSVs();
setInterval(loadCSVs, 60 * 60 * 1000);
