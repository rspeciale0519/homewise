import { describe, expect, it } from "vitest";
import { filterCsvColumns, parseListPreview } from "./csv-validator";

describe("parseListPreview", () => {
  it("rejects an empty CSV", () => {
    const r = parseListPreview("");
    expect(r.error).toBe("CSV is empty.");
  });

  it("accepts any CSV with headers and data rows (no required columns)", () => {
    const csv = "anything,goes,here\n1,2,3\n4,5,6";
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.columns).toEqual(["anything", "goes", "here"]);
    expect(r.rowCount).toBe(2);
    expect(r.previewRows).toHaveLength(2);
  });

  it("warns when CSV has headers but no data rows", () => {
    const r = parseListPreview("a,b,c");
    expect(r.error).toBeUndefined();
    expect(r.rowCount).toBe(0);
    expect(r.warnings.join(" ")).toContain("no data rows");
  });

  it("synthesizes column names for empty headers", () => {
    const csv = "a,,c\n1,2,3";
    const r = parseListPreview(csv);
    expect(r.columns).toEqual(["a", "column_2", "c"]);
  });

  it("returns at most 5 preview rows", () => {
    const csv = ["a,b", ...Array.from({ length: 20 }, (_, i) => `${i},${i * 2}`)].join("\n");
    const r = parseListPreview(csv);
    expect(r.rowCount).toBe(20);
    expect(r.previewRows).toHaveLength(5);
  });

  it("preserves quoted commas and escaped quotes", () => {
    const csv = `name,city\n"Doe, Jane","Lake Mary"\n"O""Brien","Orlando"`;
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.previewRows[0]?.name).toBe("Doe, Jane");
    expect(r.previewRows[1]?.name).toBe('O"Brien');
  });

  it("strips a UTF-8 BOM", () => {
    const csv = `﻿first_name,last_name\nJane,Doe`;
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.columns[0]).toBe("first_name");
  });

  it("handles CRLF line endings", () => {
    const csv = `a,b\r\n1,2\r\n3,4\r\n`;
    const r = parseListPreview(csv);
    expect(r.rowCount).toBe(2);
    expect(r.previewRows[1]?.a).toBe("3");
  });

  it("computes fill percentage per column", () => {
    const csv = "name,phone,notes\nA,555,memo\nB,,\nC,777,note2\nD,,";
    const r = parseListPreview(csv);
    expect(r.fillPercent.name).toBe(100);
    expect(r.fillPercent.phone).toBe(50);
    expect(r.fillPercent.notes).toBe(50);
  });
});

describe("filterCsvColumns", () => {
  const sample = "first_name,last_name,address_1,lead_score\nJane,Doe,1 Oak,87\nJohn,Roe,2 Elm,64";

  it("returns input unchanged when no exclusions", () => {
    expect(filterCsvColumns(sample, [])).toBe(sample);
  });

  it("returns input unchanged when exclusions don't match any header", () => {
    expect(filterCsvColumns(sample, ["nonexistent"])).toBe(sample);
  });

  it("removes specified columns from headers and every row", () => {
    const filtered = filterCsvColumns(sample, ["lead_score"]);
    const lines = filtered.split("\n");
    expect(lines[0]).toBe("first_name,last_name,address_1");
    expect(lines[1]).toBe("Jane,Doe,1 Oak");
    expect(lines[2]).toBe("John,Roe,2 Elm");
  });

  it("removes multiple columns at once", () => {
    const filtered = filterCsvColumns(sample, ["last_name", "lead_score"]);
    const lines = filtered.split("\n");
    expect(lines[0]).toBe("first_name,address_1");
    expect(lines[1]).toBe("Jane,1 Oak");
  });

  it("re-quotes cells that contain commas after being kept", () => {
    const csv = "name,address\nJane,\"123 Oak, Apt 4\"\nJohn,\"5 Pine\"";
    const filtered = filterCsvColumns(csv, []);
    expect(filtered).toBe(csv);
    const filtered2 = filterCsvColumns("a,name,address\n1,Jane,\"123 Oak, Apt 4\"", ["a"]);
    expect(filtered2).toBe('name,address\nJane,"123 Oak, Apt 4"');
  });

  it("throws when filtering would leave zero columns", () => {
    expect(() => filterCsvColumns(sample, ["first_name", "last_name", "address_1", "lead_score"]))
      .toThrow();
  });
});
