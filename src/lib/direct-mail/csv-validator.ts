import { LIST_PREVIEW_ROW_COUNT } from "./constants";

export type ParsedListPreview = {
  error?: string;
  warnings: string[];
  rowCount: number;
  columns: string[];
  previewRows: Array<Record<string, string>>;
  fillPercent: Record<string, number>;
};

function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function parseListPreview(text: string): ParsedListPreview {
  const warnings: string[] = [];
  const stripped = text.replace(/^﻿/, "");
  const lines = stripped.split(/\r?\n/).filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      error: "CSV is empty.",
      warnings,
      rowCount: 0,
      columns: [],
      previewRows: [],
      fillPercent: {},
    };
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return {
      error: "CSV missing header row.",
      warnings,
      rowCount: 0,
      columns: [],
      previewRows: [],
      fillPercent: {},
    };
  }
  const columns = splitCsvRow(headerLine).map((h, i) => h || `column_${i + 1}`);
  if (columns.length === 0) {
    return {
      error: "CSV has no columns.",
      warnings,
      rowCount: 0,
      columns: [],
      previewRows: [],
      fillPercent: {},
    };
  }

  const dataRows = lines.slice(1);
  const filledCounts: Record<string, number> = Object.fromEntries(
    columns.map((c) => [c, 0]),
  );
  const previewRows: Array<Record<string, string>> = [];
  const previewLimit = Math.min(LIST_PREVIEW_ROW_COUNT, dataRows.length);

  for (let i = 0; i < dataRows.length; i += 1) {
    const rawLine = dataRows[i];
    if (!rawLine) continue;
    const cells = splitCsvRow(rawLine);
    columns.forEach((col, idx) => {
      const cell = cells[idx];
      if (cell !== undefined && cell.length > 0) {
        filledCounts[col] = (filledCounts[col] ?? 0) + 1;
      }
    });
    if (i < previewLimit) {
      const record: Record<string, string> = {};
      columns.forEach((col, idx) => {
        record[col] = cells[idx] ?? "";
      });
      previewRows.push(record);
    }
  }

  const fillPercent: Record<string, number> = {};
  for (const col of columns) {
    fillPercent[col] = dataRows.length > 0
      ? Math.round(((filledCounts[col] ?? 0) / dataRows.length) * 100)
      : 0;
  }

  if (dataRows.length === 0) {
    warnings.push("CSV has headers but no data rows.");
  }

  return {
    warnings,
    rowCount: dataRows.length,
    columns,
    previewRows,
    fillPercent,
  };
}

export function filterCsvColumns(text: string, excludedColumns: string[]): string {
  if (excludedColumns.length === 0) return text;

  const stripped = text.replace(/^﻿/, "");
  const lines = stripped.split(/\r?\n/);
  if (lines.length === 0) return text;

  const headerLine = lines[0];
  if (!headerLine) return text;
  const headers = splitCsvRow(headerLine).map((h, i) => h || `column_${i + 1}`);
  const excludedSet = new Set(excludedColumns);
  const keepIndices = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !excludedSet.has(h))
    .map(({ i }) => i);

  if (keepIndices.length === 0) {
    throw new Error("filterCsvColumns: would result in zero columns");
  }
  if (keepIndices.length === headers.length) {
    return text;
  }

  const outLines: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      outLines.push("");
      continue;
    }
    const cells = splitCsvRow(line);
    const kept = keepIndices.map((idx) => escapeCsvCell(cells[idx] ?? ""));
    outLines.push(kept.join(","));
  }
  return outLines.join("\n");
}
