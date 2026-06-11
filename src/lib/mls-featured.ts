export function parseOfficeIds(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export function isHomewiseOffice(officeId: string | null | undefined): boolean {
  if (!officeId) {
    return false;
  }

  return parseOfficeIds(process.env.HOMEWISE_OFFICE_MLS_ID).includes(officeId.trim());
}
