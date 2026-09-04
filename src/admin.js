import { isConfigured, supabase } from "./supabase.js";
import { createGiftSelectionsWorkbook } from "./xlsx.js";

const loginPanel = document.querySelector("#loginPanel");
const loginForm = document.querySelector("#loginForm");
const loginButton = document.querySelector("#loginButton");
const loginError = document.querySelector("#loginError");
const dashboard = document.querySelector("#dashboard");
const signOutButton = document.querySelector("#signOutButton");
const exportButton = document.querySelector("#exportButton");
const dataError = document.querySelector("#dataError");
const searchInput = document.querySelector("#searchInput");
const giftFilter = document.querySelector("#giftFilter");

let submissions = [];
let staffTotal = 0;

function showMessage(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearMessage(element) {
  element.hidden = true;
  element.textContent = "";
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  button.setAttribute("aria-busy", String(loading));
}

async function verifyAdmin() {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

async function showAuthenticatedView() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    signOutButton.hidden = true;
    return;
  }

  if (!await verifyAdmin()) {
    await supabase.auth.signOut();
    loginPanel.hidden = false;
    dashboard.hidden = true;
    signOutButton.hidden = true;
    showMessage(loginError, "This account does not have administrator access.");
    return;
  }

  loginPanel.hidden = true;
  dashboard.hidden = false;
  signOutButton.hidden = false;
  await loadSubmissions();
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessage(loginError);

  if (!isConfigured) {
    showMessage(loginError, "Supabase is not configured for this deployment.");
    return;
  }

  setLoading(loginButton, true);
  const { error } = await supabase.auth.signInWithPassword({
    email: document.querySelector("#email").value.trim(),
    password: document.querySelector("#password").value
  });
  setLoading(loginButton, false);

  if (error) {
    showMessage(loginError, "Sign-in failed. Check the email and password and try again.");
    return;
  }
  await showAuthenticatedView();
});

signOutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  loginForm.reset();
  loginPanel.hidden = false;
  dashboard.hidden = true;
  signOutButton.hidden = true;
});

async function loadSubmissions() {
  clearMessage(dataError);
  exportButton.disabled = true;
  document.querySelector("#lastUpdated").textContent = "Loading submissions…";

  const [selectionResult, countResult] = await Promise.all([
    supabase
      .from("gift_selections")
      .select("id, gift_name, spa_treatment, submitted_at, staff:staff_id(employee_name, designation, unit, branch, department)")
      .order("submitted_at", { ascending: false }),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("active", true)
  ]);

  if (selectionResult.error) {
    showMessage(dataError, "Responses could not be loaded. Please refresh or verify administrator access.");
    document.querySelector("#lastUpdated").textContent = "Unable to load responses";
    return;
  }

  submissions = selectionResult.data ?? [];
  staffTotal = countResult.count ?? 0;
  document.querySelector("#lastUpdated").textContent = `Updated ${new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date())}`;
  document.querySelector("#totalCount").textContent = submissions.length;
  document.querySelector("#hamperCount").textContent = submissions.filter(row => row.gift_name === "Teej Gift Hamper").length;
  document.querySelector("#spaCount").textContent = submissions.filter(row => row.gift_name === "Tranquility Spa").length;
  document.querySelector("#pendingCount").textContent = Math.max(0, staffTotal - submissions.length);
  exportButton.disabled = submissions.length === 0;
  renderRows();
}

function filteredRows() {
  const search = searchInput.value.trim().toLocaleLowerCase();
  const gift = giftFilter.value;
  return submissions.filter(row => {
    const fields = [row.staff?.employee_name, row.staff?.designation, row.staff?.unit, row.staff?.branch, row.staff?.department, row.gift_name, row.spa_treatment];
    const matchesSearch = !search || fields.some(value => String(value ?? "").toLocaleLowerCase().includes(search));
    return matchesSearch && (!gift || row.gift_name === gift);
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu"
  }).format(new Date(date));
}

function addCell(row, value, className = "") {
  const cell = document.createElement("td");
  if (className) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = value || "—";
    cell.append(span);
  } else {
    cell.textContent = value || "—";
  }
  row.append(cell);
}

function renderRows() {
  const rows = filteredRows();
  const tbody = document.querySelector("#submissionRows");
  tbody.replaceChildren();

  rows.forEach(item => {
    const row = document.createElement("tr");
    addCell(row, item.staff?.employee_name);
    addCell(row, item.staff?.designation);
    addCell(row, item.staff?.unit);
    addCell(row, item.staff?.branch);
    addCell(row, item.staff?.department);
    addCell(row, item.gift_name, "gift-pill");
    addCell(row, item.spa_treatment);
    addCell(row, formatDate(item.submitted_at));
    tbody.append(row);
  });

  document.querySelector("#emptyState").hidden = rows.length > 0;
  document.querySelector("#rowCount").textContent = `${rows.length} response${rows.length === 1 ? "" : "s"}`;
}

searchInput.addEventListener("input", renderRows);
giftFilter.addEventListener("change", renderRows);
document.querySelector("#refreshButton").addEventListener("click", loadSubmissions);

exportButton.addEventListener("click", async () => {
  const rows = filteredRows();
  if (!rows.length) return;
  exportButton.disabled = true;
  exportButton.textContent = "Preparing Excel…";

  try {
    const blob = createGiftSelectionsWorkbook({
      rows: rows.map(item => ({ ...item, formattedSubmitted: formatDate(item.submitted_at) })),
      allRows: submissions,
      staffTotal,
      generatedAt: formatDate(new Date().toISOString())
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teej-2083-gift-selections-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    showMessage(dataError, "The Excel file could not be generated. Please try again.");
  } finally {
    exportButton.disabled = submissions.length === 0;
    exportButton.textContent = "Download Excel";
  }
});

if (!isConfigured) {
  showMessage(loginError, "Supabase is not configured for this deployment.");
  loginForm.querySelectorAll("input, button").forEach(control => { control.disabled = true; });
} else {
  showAuthenticatedView();
}
