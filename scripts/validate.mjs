import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { createGiftSelectionsWorkbook } from "../src/xlsx.js";

const migration = await readFile(new URL("../supabase/migrations/20260904000000_teej_gift_schema.sql", import.meta.url), "utf8");
const staffInsert = migration.match(/insert into public\.staff[\s\S]+?on conflict \(employee_name\)/)?.[0] ?? "";
const staffRows = staffInsert.match(/^\s*\('[^\n]+\),?$/gm) ?? [];
assert.equal(staffRows.length, 68, "Migration should contain all 68 staff rows");

const sample = {
  id: "6c5b5e3a-4b4a-48c2-8b31-333333333333",
  gift_name: "Tranquility Spa",
  spa_treatment: "Bukuwa — 30 min",
  formattedSubmitted: "04 Sep 2026, 01:00 pm",
  staff: {
    employee_name: "Sample Employee",
    designation: "Officer",
    unit: "Bajaj Bikes",
    branch: "Corporate Office",
    department: "Admin"
  }
};
const workbook = createGiftSelectionsWorkbook({ rows: [sample], allRows: [sample], staffTotal: 68, generatedAt: "04 Sep 2026" });
const archive = unzipSync(new Uint8Array(await workbook.arrayBuffer()));
for (const requiredFile of ["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]) {
  assert.ok(archive[requiredFile], `Workbook is missing ${requiredFile}`);
}
const detailSheet = strFromU8(archive["xl/worksheets/sheet1.xml"]);
assert.match(detailSheet, /Sample Employee/);
assert.match(detailSheet, /Tranquility Spa/);
assert.match(detailSheet, /autoFilter/);

console.log("Validation passed: 68 staff rows and a valid two-sheet XLSX package.");
