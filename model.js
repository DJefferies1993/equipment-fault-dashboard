// SECTION 1 — Fault records and validation
// Keep validation independent of the page so it can be tested directly.
export const SEVERITIES = ["Critical", "Warning", "Info"];
export const STATUSES = ["Open", "In progress", "Resolved"];

export function validateFault(fault) {
  if (!fault || typeof fault !== "object") throw new Error("Invalid fault record.");
  for (const field of ["id", "equipment", "summary", "createdAt"]) {
    if (typeof fault[field] !== "string" || !fault[field].trim()) {
      throw new Error(`Missing ${field}.`);
    }
  }
  if (fault.id.length > 100 || fault.equipment.length > 80 || fault.summary.length > 250) {
    throw new Error("A field exceeds its allowed length.");
  }
  if (!SEVERITIES.includes(fault.severity) || !STATUSES.includes(fault.status)) {
    throw new Error("Unknown severity or status.");
  }
  if (!Number.isFinite(Date.parse(fault.createdAt))) throw new Error("Invalid creation time.");
  return {id: fault.id.trim(), equipment: fault.equipment.trim(), summary: fault.summary.trim(),
    severity: fault.severity, status: fault.status, createdAt: fault.createdAt};
}

// SECTION 2 — Import and filtering
// Validate an entire import before replacing any stored records.
export function parseImport(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data) || data.length > 1000) throw new Error("Import up to 1,000 records as a JSON array.");
  const rows = data.map(validateFault);
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Duplicate fault IDs.");
  return rows;
}

export function filterFaults(faults, search = "", severity = "All", status = "All") {
  const query = search.trim().toLowerCase();
  return faults.filter(fault =>
    `${fault.equipment} ${fault.summary}`.toLowerCase().includes(query) &&
    (severity === "All" || fault.severity === severity) &&
    (status === "All" || fault.status === status)
  ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// SECTION 3 — Dashboard totals
// Summary cards always describe the full dataset, independently of filters.
export function summarise(faults) {
  return {
    total: faults.length,
    active: faults.filter(fault => fault.status !== "Resolved").length,
    critical: faults.filter(fault => fault.severity === "Critical" && fault.status !== "Resolved").length,
    resolved: faults.filter(fault => fault.status === "Resolved").length
  };
}

export function demoFaults() {
  return [
    {id: "demo-1", equipment: "Coagulation analyser 01", summary: "Sample count differs from completed tests", severity: "Critical", status: "Open", createdAt: "2026-01-06T10:15:00Z"},
    {id: "demo-2", equipment: "Haematology analyser 02", summary: "Reagent level below reorder threshold", severity: "Warning", status: "In progress", createdAt: "2026-01-06T09:30:00Z"},
    {id: "demo-3", equipment: "Sample loader 03", summary: "Intermittent barcode read failure", severity: "Warning", status: "Open", createdAt: "2026-01-05T14:00:00Z"},
    {id: "demo-4", equipment: "Centrifuge 04", summary: "Scheduled inspection completed", severity: "Info", status: "Resolved", createdAt: "2026-01-05T08:00:00Z"},
    {id: "demo-5", equipment: "Coagulation analyser 01", summary: "Connection restored after restart", severity: "Info", status: "Resolved", createdAt: "2026-01-04T16:45:00Z"}
  ];
}
