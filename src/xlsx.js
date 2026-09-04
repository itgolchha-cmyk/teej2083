import { strToU8, zipSync } from "fflate";

const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function cellXml(value, rowIndex, columnIndex, style = 0) {
  const reference = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${style ? ` s="${style}"` : ""}><v>${value}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ""}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(rows, widths, options = {}) {
  const sheetRows = rows.map((row, rowOffset) => {
    const rowNumber = rowOffset + 1;
    const style = options.titleRow === rowNumber ? 2 : options.headerRow === rowNumber ? 1 : 0;
    return `<row r="${rowNumber}">${row.map((value, columnIndex) => cellXml(value, rowNumber, columnIndex, style)).join("")}</row>`;
  }).join("");
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const lastColumn = columnName(Math.max(0, (rows[0]?.length ?? 1) - 1));
  const lastRow = Math.max(1, rows.length);
  const freeze = options.freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter = options.headerRow ? `<autoFilter ref="A${options.headerRow}:${lastColumn}${lastRow}"/>` : "";
  const merge = options.mergeTitle ? `<mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells>` : "";
  return `${xmlHeader}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}<cols>${columns}</cols><sheetData>${sheetRows}</sheetData>${filter}${merge}</worksheet>`;
}

export function createGiftSelectionsWorkbook({ rows, allRows, staffTotal, generatedAt }) {
  const detailRows = [
    ["Employee Name", "Designation", "Unit", "Branch", "Department", "Gift", "Spa Treatment", "Submitted (Nepal Time)", "Reference ID"],
    ...rows.map(item => [
      item.staff?.employee_name ?? "",
      item.staff?.designation ?? "",
      item.staff?.unit ?? "",
      item.staff?.branch ?? "",
      item.staff?.department ?? "",
      item.gift_name,
      item.spa_treatment ?? "",
      item.formattedSubmitted,
      item.id
    ])
  ];
  const summaryRows = [
    ["Teej 2083 Gift Selection Summary", ""],
    ["Generated", generatedAt],
    ["Total staff", staffTotal],
    ["Total submitted", allRows.length],
    ["Teej Gift Hamper", allRows.filter(row => row.gift_name === "Teej Gift Hamper").length],
    ["Tranquility Spa", allRows.filter(row => row.gift_name === "Tranquility Spa").length],
    ["Awaiting response", Math.max(0, staffTotal - allRows.length)]
  ];

  const files = {
    "[Content_Types].xml": `${xmlHeader}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${xmlHeader}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Gift Selections" sheetId="1" r:id="rId1"/><sheet name="Summary" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `${xmlHeader}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF7F1734"/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7F1734"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": worksheetXml(detailRows, [27,30,22,28,22,23,36,25,38], { headerRow: 1, freezeHeader: true }),
    "xl/worksheets/sheet2.xml": worksheetXml(summaryRows, [32,25], { titleRow: 1, mergeTitle: true })
  };

  const archive = zipSync(Object.fromEntries(Object.entries(files).map(([name, contents]) => [name, strToU8(contents)])), { level: 6 });
  return new Blob([archive], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
