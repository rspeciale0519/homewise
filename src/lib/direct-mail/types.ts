import type { ReturnAddress } from "./schemas";
import type { Workflow, ProductType, MailClass } from "./constants";

export type ArtworkFile = {
  id: string;
  name: string;
  fileKey: string;
  fileName: string;
  byteSize: number;
  mimeType: string;
  warnings: string[];
};

export type ArtworkRow = {
  id: string;
  name: string;
  upload: Omit<ArtworkFile, "id" | "name"> | null;
};

export type DraftState = {
  id: string;
  currentStep: number;
  workflow: Workflow;
  subjectPropertyAddress: string | null;
  campaignName: string | null;
  productType: ProductType | null;
  productSize: string | null;
  mailClass: MailClass | null;
  dropDate: string | null;
  returnAddress: ReturnAddress | null;
  quantity: number;
  listRowCount: number;
  specialInstructions: string | null;
  artworkRows: ArtworkRow[];
  listFileKey: string | null;
  complianceConfirmed: boolean;
};

export type ArtworkUploadResult = {
  fileKey: string;
  fileName: string;
  byteSize: number;
  mimeType: string;
  warnings: string[];
};

export type ListUploadResult = {
  fileKey: string;
  fileName: string;
  byteSize: number;
  rowCount: number;
  previewRows: Array<Record<string, string>>;
  warnings: string[];
};
