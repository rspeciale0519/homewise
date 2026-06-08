import { afterEach, describe, expect, it } from "vitest";
import { buildOpenHouseUrl, buildPropertyUrl, hasCredentials } from "./mls-grid";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("MLS Grid query builders", () => {
  it("detects static token credentials", () => {
    process.env.MLS_GRID_TOKEN = "token";
    process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME = "MFRMLS";

    expect(hasCredentials()).toBe(true);
  });

  it("builds property URLs with the required origin filter and media expansion", () => {
    process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME = "MFRMLS";

    const url = buildPropertyUrl({});

    expect(url).toContain("OriginatingSystemName+eq+%27MFRMLS%27");
    expect(url).toContain("%24expand=Media");
    expect(url).not.toContain("OpenHouse");
  });

  it("adds initial import visibility filter", () => {
    process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME = "MFRMLS";

    const url = buildPropertyUrl({ initialImport: true });

    expect(url).toContain("MlgCanView+eq+true");
  });

  it("adds ge cursor filters for modified imports", () => {
    process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME = "MFRMLS";

    const url = buildPropertyUrl({ modifiedAfter: "2026-06-08T00:00:00Z" });

    expect(url).toContain("ModificationTimestamp+ge+2026-06-08T00%3A00%3A00Z");
  });

  it("adds office filters when configured", () => {
    process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME = "MFRMLS";
    process.env.MLS_OFFICE_ID = "HW123";

    const url = buildPropertyUrl({});

    expect(url).toContain("ListOfficeMlsId+eq+%27HW123%27");
  });

  it("builds OpenHouse URLs with origin and cursor filters", () => {
    process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME = "MFRMLS";

    const url = buildOpenHouseUrl({ modifiedAfter: "2026-06-08T00:00:00Z" });

    expect(url).toContain("/OpenHouse?");
    expect(url).toContain("OriginatingSystemName+eq+%27MFRMLS%27");
    expect(url).toContain("ModificationTimestamp+ge+2026-06-08T00%3A00%3A00Z");
  });
});
