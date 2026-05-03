export const WORKFLOWS = ["just_sold", "just_listed", "farm", "browse"] as const;
export type Workflow = (typeof WORKFLOWS)[number];

export function workflowFromSlug(slug: string | undefined | null): Workflow {
  switch (slug) {
    case "just-sold":
    case "just_sold":
      return "just_sold";
    case "just-listed":
    case "just_listed":
      return "just_listed";
    case "farm":
      return "farm";
    case "browse":
    default:
      return "browse";
  }
}

export function workflowToSlug(w: Workflow): string {
  return w.replace(/_/g, "-");
}

export function workflowLabel(w: Workflow): string {
  switch (w) {
    case "just_sold":
      return "Just Sold campaign";
    case "just_listed":
      return "Just Listed campaign";
    case "farm":
      return "Farm campaign";
    case "browse":
      return "Custom direct mail order";
  }
}

export const PRODUCT_TYPES = [
  "postcard",
  "letter",
  "snap_pack",
  "eddm",
  "door_hanger",
  "other",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export function productTypeLabel(p: ProductType): string {
  switch (p) {
    case "postcard":
      return "Postcard";
    case "letter":
      return "Letter";
    case "snap_pack":
      return "Snap pack";
    case "eddm":
      return "EDDM (Every Door Direct Mail)";
    case "door_hanger":
      return "Door hanger";
    case "other":
      return "Other / specify in notes";
  }
}

export const PRODUCT_SIZE_OPTIONS: Record<ProductType, string[]> = {
  postcard: ["4x6", "5x7", "6x9", "6x11", "9x12"],
  letter: ["Standard letter", "Tri-fold mailer", "Bi-fold mailer"],
  snap_pack: ["#10 snap pack"],
  eddm: ["6.5x9", "6.5x12", "8.5x11"],
  door_hanger: ["4.25x11", "5x12"],
  other: [],
};

export const MAIL_CLASSES = ["first_class", "marketing_mail", "eddm"] as const;
export type MailClass = (typeof MAIL_CLASSES)[number];

export function mailClassLabel(c: MailClass): string {
  switch (c) {
    case "first_class":
      return "First-Class Mail";
    case "marketing_mail":
      return "USPS Marketing Mail";
    case "eddm":
      return "EDDM";
  }
}

export const MAX_ARTWORK_BYTES = 50 * 1024 * 1024;
export const MAX_ARTWORK_FILES_PER_ORDER = 25;
export const ARTWORK_UPLOAD_CONCURRENCY = 4;
export const MAX_LIST_FILES_PER_ORDER = 10;
export const MAX_LIST_ROWS = 50_000;
export const MAX_LIST_BYTES = 25 * 1024 * 1024;
export const LIST_PREVIEW_ROW_COUNT = 5;

export const ACCEPTED_ARTWORK_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ARTWORK_ACCEPT_HINT = "PDF, PNG, JPG, or Word (.doc / .docx)";

export const ACCEPTED_LIST_MIME = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/csv",
  "text/plain",
] as const;

export const LIST_ACCEPT_HINT = "CSV files only";

export const RESEND_RATE_LIMIT_MS = 5 * 60 * 1000;

/** How long submitted orders' files stay on HomeWise before the daily purge cron deletes them. */
export const ORDER_FILE_RETENTION_DAYS = 30;

export function dropDateMinBusinessDays(): number {
  const raw = process.env.DIRECT_MAIL_DROP_DATE_MIN_BUSINESS_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;
}

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}

export function earliestDropDate(now: Date = new Date()): Date {
  return addBusinessDays(now, dropDateMinBusinessDays());
}
