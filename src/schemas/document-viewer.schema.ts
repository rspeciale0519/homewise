import { z } from "zod";

export const signatureSchema = z.object({
  imageData: z
    .string()
    .min(1, "Signature data is required")
    .refine(
      (val) => val.startsWith("data:image/png;base64,"),
      "Signature must be a base64 PNG data URL"
    ),
});

export type SignatureInput = z.infer<typeof signatureSchema>;

export const createSignatureSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be 50 characters or fewer"),
  imageData: z
    .string()
    .min(1, "Signature data is required")
    .refine(
      (val) => val.startsWith("data:image/png;base64,"),
      "Signature must be a base64 PNG data URL"
    ),
  source: z.enum(["drawn", "uploaded"]),
});

export const updateSignatureSchema = z.object({
  id: z.string().min(1),
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be 50 characters or fewer"),
});

export const deleteSignatureSchema = z.object({
  id: z.string().min(1),
});

export const annotationSchema = z.object({
  id: z.string(),
  pageIndex: z.number().int().min(0),
  pdfX: z.number(),
  pdfY: z.number(),
  type: z.enum(["text", "signature"]),
  value: z.string(),
  fontSize: z.number().default(12),
  color: z.string().default("#000000"),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const formValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.string()),
]);

export const exportSchema = z.object({
  documentPath: z.string().min(1),
  annotations: z.array(annotationSchema),
  formValues: z.record(z.string(), formValueSchema).optional(),
  flatten: z.boolean().optional(),
  action: z.enum(["download", "email"]),
  emailTo: z.string().email().optional(),
  emailSubject: z.string().max(200).optional(),
  emailMessage: z.string().max(2000).optional(),
});

export type ExportInput = z.infer<typeof exportSchema>;

export const draftSchema = z.object({
  documentPath: z.string().min(1),
  documentName: z.string().min(1),
  annotations: z.object({
    version: z.literal(1),
    documentPath: z.string(),
    annotations: z.array(annotationSchema),
    selectedContactId: z.string().nullable(),
    lastModified: z.string(),
  }),
});

export type DraftInput = z.infer<typeof draftSchema>;

export const documentFavoriteSchema = z.object({
  documentPath: z.string().min(1),
  documentName: z.string().min(1),
});

export type DocumentFavoriteInput = z.infer<typeof documentFavoriteSchema>;
