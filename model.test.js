import test from "node:test";
import assert from "node:assert/strict";
import {demoFaults, parseImport, filterFaults, summarise, validateFault} from "./model.js";

// SECTION 1 — Register filters and summary rules
test("demo totals distinguish active critical faults from resolved faults", () => {
  assert.deepEqual(summarise(demoFaults()), {total: 5, active: 3, critical: 1, resolved: 2});
});
test("search and both filters work together", () => {
  const rows = filterFaults(demoFaults(), "ANALYSER", "Warning", "In progress");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "demo-2");
});
test("no results and empty totals are valid", () => {
  assert.equal(filterFaults(demoFaults(), "missing").length, 0);
  assert.deepEqual(summarise([]), {total: 0, active: 0, critical: 0, resolved: 0});
});

// SECTION 2 — Import validation
test("exported data can be imported without changing records", () => {
  assert.deepEqual(parseImport(JSON.stringify(demoFaults())), demoFaults());
});
test("duplicate identifiers reject the entire import", () => {
  assert.throws(() => parseImport(JSON.stringify([demoFaults()[0], demoFaults()[0]])), /Duplicate/);
});
test("unknown statuses and invalid dates are rejected", () => {
  assert.throws(() => validateFault({...demoFaults()[0], status: "Unknown"}), /Unknown/);
  assert.throws(() => validateFault({...demoFaults()[0], createdAt: "bad"}), /time/);
});
test("blank fields and oversized imports are rejected", () => {
  assert.throws(() => validateFault({...demoFaults()[0], equipment: " "}), /equipment/);
  assert.throws(() => parseImport(JSON.stringify(Array(1001).fill(demoFaults()[0]))), /1,000/);
});
test("sorting does not mutate the source array", () => {
  const faults = demoFaults().reverse();
  const before = JSON.stringify(faults);
  const result = filterFaults(faults);
  assert.equal(result[0].id, "demo-1");
  assert.equal(JSON.stringify(faults), before);
});
