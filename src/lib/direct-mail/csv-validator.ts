import { LIST_COLUMN_ALIASES, REQUIRED_LIST_COLUMNS } from "./constants";

export type ParsedListPreview = {
  error?: string;
  warnings: string[];
  rowCount: number;
  previewRows: Array<Record<string, string>>;
  normalizedHeaders: string[];
  passthroughHeaders: string[];
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

function normalizeHeader(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return LIST_COLUMN_ALIASES[cleaned] ?? cleaned;
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
      previewRows: [],
      normalizedHeaders: [],
      passthroughHeaders: [],
    };
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return {
      error: "CSV missing header row.",
      warnings,
      rowCount: 0,
      previewRows: [],
      normalizedHeaders: [],
      passthroughHeaders: [],
    };
  }
  const rawHeaders = splitCsvRow(headerLine);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const missing = REQUIRED_LIST_COLUMNS.filter((c) => !normalizedHeaders.includes(c));
  if (missing.length > 0) {
    return {
      error: `Missing required columns: ${missing.join(", ")}. Required: ${REQUIRED_LIST_COLUMNS.join(", ")}.`,
      warnings,
      rowCount: 0,
      previewRows: [],
      normalizedHeaders,
      passthroughHeaders: [],
    };
  }

  const passthroughHeaders = normalizedHeaders.filter(
    (h) => !(REQUIRED_LIST_COLUMNS as readonly string[]).includes(h),
  );

  const dataRows = lines.slice(1);
  const previewRows: Array<Record<string, string>> = [];
  const previewLimit = Math.min(5, dataRows.length);
  for (let i = 0; i < previewLimit; i += 1) {
    const rawLine = dataRows[i];
    if (!rawLine) continue;
    const cells = splitCsvRow(rawLine);
    const record: Record<string, string> = {};
    normalizedHeaders.forEach((h, idx) => {
      record[h] = cells[idx] ?? "";
    });
    previewRows.push(record);
  }

  if (passthroughHeaders.length > 0) {
    warnings.push(
      `Extra columns will be passed through to YLS as merge variables: ${passthroughHeaders.join(", ")}`,
    );
  }

  return {
    warnings,
    rowCount: dataRows.length,
    previewRows,
    normalizedHeaders,
    passthroughHeaders,
  };
}
