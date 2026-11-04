import {validateFault, parseImport, filterFaults, summarise, demoFaults, STATUSES} from "./model.js";

// SECTION 1 — Browser storage
// The first visit loads demo data; later visits restore this browser's records.
const STORAGE_KEY = "dean-equipment-faults-v1";
const get = id => document.getElementById(id);
let faults = [];
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  faults = saved === null ? demoFaults() : parseImport(saved);
} catch {
  get("message").textContent = "Saved records could not be read. Export or clear site storage before loading a new dataset.";
}

function save(nextFaults) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFaults));
    faults = nextFaults;
    return true;
  } catch {
    announce("Storage is unavailable or full. Your change was not saved.");
    return false;
  }
}

function announce(message) {
  get("message").textContent = message;
}

// SECTION 2 — Summary and table rendering
// User-entered text is inserted as text, never as executable HTML.
function render() {
  const totals = summarise(faults);
  for (const key of ["total", "active", "critical", "resolved"]) get(key).textContent = totals[key];
  const visible = filterFaults(faults, get("search").value, get("severity-filter").value, get("status-filter").value);
  get("result-count").textContent = `${visible.length} of ${faults.length} records`;
  get("rows").replaceChildren();
  get("empty").hidden = visible.length !== 0;
  for (const fault of visible) {
    const row = document.createElement("tr");
    const equipment = row.insertCell();
    const name = document.createElement("strong");
    name.textContent = fault.equipment;
    equipment.append(name);
    row.insertCell().textContent = fault.summary;
    const severity = document.createElement("span");
    severity.className = `badge ${fault.severity.toLowerCase()}`;
    severity.textContent = fault.severity;
    row.insertCell().append(severity);
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Status for ${fault.equipment}: ${fault.summary}`);
    for (const status of STATUSES) select.add(new Option(status, status));
    select.value = fault.status;
    select.addEventListener("change", () => {
      const next = faults.map(item => item.id === fault.id ? {...item, status: select.value} : item);
      if (save(next)) announce(`Updated ${fault.equipment} to ${select.value}.`);
      render();
    });
    row.insertCell().append(select);
    row.insertCell().textContent = new Date(fault.createdAt).toLocaleString([], {dateStyle: "medium", timeStyle: "short"});
    get("rows").append(row);
  }
  const maximum = Math.max(1, ...STATUSES.map(status => faults.filter(fault => fault.status === status).length));
  get("chart").replaceChildren();
  for (const status of STATUSES) {
    const count = faults.filter(fault => fault.status === status).length;
    const item = document.createElement("div");
    item.className = "chart-row";
    const label = document.createElement("span");
    label.textContent = status;
    const track = document.createElement("div");
    track.className = "track";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.width = `${count / maximum * 100}%`;
    track.append(bar);
    const value = document.createElement("strong");
    value.textContent = count;
    item.append(label, track, value);
    get("chart").append(item);
  }
}

// SECTION 3 — New fault form
get("fault-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    if (faults.length >= 1000) throw new Error("The local dataset is limited to 1,000 records.");
    const fault = validateFault({id: crypto.randomUUID(), equipment: get("equipment").value,
      summary: get("summary").value, severity: get("severity").value,
      status: "Open", createdAt: new Date().toISOString()});
    if (save([...faults, fault])) {
      get("fault-form").reset();
      announce(`Logged a fault for ${fault.equipment}.`);
      render();
    }
  } catch (error) { announce(error.message); }
});

// SECTION 4 — Filters, export and import
for (const id of ["search", "severity-filter", "status-filter"]) get(id).addEventListener("input", render);
get("export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(faults, null, 2)], {type: "application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "equipment-faults.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce("Exported all records as JSON.");
});

get("import-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error("Import files must be smaller than 2 MB.");
    const imported = parseImport(await file.text());
    if (confirm(`Replace all ${faults.length} current records with ${imported.length} imported records? Export first if needed.`)) {
      if (save(imported)) { render(); announce("Imported records successfully."); }
    }
  } catch (error) { announce(`Import failed: ${error.message}`); }
  event.target.value = "";
});

get("demo").addEventListener("click", () => {
  if (confirm("Replace current records with fictional demo data? Export first if needed.")) {
    if (save(demoFaults())) { render(); announce("Demo data loaded."); }
  }
});

// SECTION 5 — Initial display
render();
