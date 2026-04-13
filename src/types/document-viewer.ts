export interface Annotation {
  id: string;
  pageIndex: number;
  pdfX: number;
  pdfY: number;
  type: "text" | "signature";
  value: string;
  fontSize: number;
  color: string;
  width?: number;
  height?: number;
}

export type AnnotationMode =
  | "cursor"
  | "text"
  | "signature"
  | "agent-field"
  | "contact-field";

export interface AgentInfo {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  brokerageName: string;
  licenseNumber: string | null;
}

export interface PageDimensions {
  pdfWidth: number;
  pdfHeight: number;
  renderWidth: number;
  renderHeight: number;
  scale: number;
}

export interface DraftAnnotations {
  version: 1;
  documentPath: string;
  annotations: Annotation[];
  selectedContactId: string | null;
  lastModified: string;
}

export type AgentFieldKey =
  | "name"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "brokerage"
  | "license";

export type ContactFieldKey =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone";

export interface SavedSignature {
  id: string;
  label: string;
  imageData: string;
  source: "drawn" | "uploaded";
}

import type { DocumentProps } from "react-pdf";

type OnDocumentLoadSuccess = NonNullable<DocumentProps["onLoadSuccess"]>;
export type PdfDocumentHandle = Parameters<OnDocumentLoadSuccess>[0];

export type FormFieldValue = string | string[] | boolean;
export type FormValues = Record<string, FormFieldValue>;
