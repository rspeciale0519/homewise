import { describe, expect, it } from "vitest";
import { parseListPreview } from "./csv-validator";

const VALID_HEADER = "first_name,last_name,address_1,city,state,zip";

describe("parseListPreview", () => {
  it("rejects an empty CSV", () => {
    const r = parseListPreview("");
    expect(r.error).toBe("CSV is empty.");
  });

  it("rejects a CSV missing required columns", () => {
    const r = parseListPreview("first_name,last_name,city\nA,B,C");
    expect(r.error).toContain("Missing required columns");
    expect(r.error).toContain("address_1");
    expect(r.error).toContain("state");
    expect(r.error).toContain("zip");
  });

  it("accepts a valid CSV and counts rows excluding the header", () => {
    const csv = [VALID_HEADER, "Jane,Doe,1 Oak,Lake Mary,FL,32746", "John,Roe,2 Elm,Sanford,FL,32771"].join("\n");
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.rowCount).toBe(2);
    expect(r.previewRows).toHaveLength(2);
    expect(r.previewRows[0]).toMatchObject({
      first_name: "Jane",
      last_name: "Doe",
      city: "Lake Mary",
      state: "FL",
      zip: "32746",
    });
  });

  it("normalizes alias headers like firstName, address, zipcode", () => {
    const csv = "firstName,LastName,Address,City,State,ZipCode\nJane,Doe,1 Oak,Lake Mary,FL,32746";
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.normalizedHeaders).toEqual([
      "first_name",
      "last_name",
      "address_1",
      "city",
      "state",
      "zip",
    ]);
    expect(r.rowCount).toBe(1);
  });

  it("returns at most 5 preview rows even for larger lists", () => {
    const dataRows = Array.from({ length: 20 }, (_, i) =>
      `Person${i},Last${i},${i} Oak,City${i},FL,3270${i % 10}`,
    );
    const csv = [VALID_HEADER, ...dataRows].join("\n");
    const r = parseListPreview(csv);
    expect(r.rowCount).toBe(20);
    expect(r.previewRows).toHaveLength(5);
  });

  it("preserves quoted commas and escaped quotes", () => {
    const csv =
      VALID_HEADER + '\n"Jane","Doe","123, Apt 4","Lake Mary","FL","32746"\n"O\'Reilly","D""oe","9 Pine","Orlando","FL","32801"';
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.previewRows[0]?.address_1).toBe("123, Apt 4");
    expect(r.previewRows[1]?.last_name).toBe('D"oe');
  });

  it("warns about extra passthrough columns", () => {
    const csv = `${VALID_HEADER},custom_offer\nJane,Doe,1 Oak,Lake Mary,FL,32746,Save 10%`;
    const r = parseListPreview(csv);
    expect(r.passthroughHeaders).toContain("custom_offer");
    expect(r.warnings.join(" ")).toContain("custom_offer");
  });

  it("strips a UTF-8 BOM", () => {
    const csv = `﻿${VALID_HEADER}\nJane,Doe,1 Oak,Lake Mary,FL,32746`;
    const r = parseListPreview(csv);
    expect(r.error).toBeUndefined();
    expect(r.normalizedHeaders[0]).toBe("first_name");
  });

  it("handles CRLF line endings", () => {
    const csv = `${VALID_HEADER}\r\nJane,Doe,1 Oak,Lake Mary,FL,32746\r\nJohn,Roe,2 Elm,Sanford,FL,32771\r\n`;
    const r = parseListPreview(csv);
    expect(r.rowCount).toBe(2);
    expect(r.previewRows[1]?.first_name).toBe("John");
  });
});
