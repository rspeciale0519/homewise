import { z } from "zod";

const MAX_SIGNATURE_DATA_LENGTH = 2_000_000;
const MAX_ANNOTATIONS = 500;
const MAX_ANNOTATION_VALUE_TOTAL = 8_000_000;
const MAX_FORM_FIELDS = 500;
const MAX_FORM_VALUE_TOTAL = 500_000;

const signatureDataSchema = z
  .string()
  .min(1, "Signature data is required")
  .max(MAX_SIGNATURE_DATA_LENGTH, "Signature image is too large")
  .regex(
    /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/,
    "Signature must be a base64 PNG data URL",
  );

export const signatureSchema = z.object({
  imageData: signatureDataSchema,
});

export type SignatureInput = z.infer<typeof signatureSchema>;

export const createSignatureSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be 50 characters or fewer"),
  imageData: signatureDataSchema,
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

export const annotationFontFamilySchema = z.enum([
  "Helvetica",
  "Times",
  "Roboto",
  "SourceSerif",
  "SourceSans",
]);

export const flagColorSchema = z.enum([
  "yellow",
  "blue",
  "green",
  "red",
  "purple",
  "orange",
]);

export const annotationSchema = z
  .object({
    id: z.string().min(1).max(100),
    pageIndex: z.number().int().min(0).max(10_000),
    pdfX: z.number().finite().min(-100_000).max(100_000),
    pdfY: z.number().finite().min(-100_000).max(100_000),
    type: z.enum(["text", "signature", "flag"]),
    value: z.string().max(MAX_SIGNATURE_DATA_LENGTH),
    fontSize: z.number().finite().min(6).max(96).default(12),
    fontFamily: annotationFontFamilySchema.optional(),
    color: z.string().max(20).default("#000000"),
    width: z.number().finite().positive().max(10_000).optional(),
    height: z.number().finite().positive().max(10_000).optional(),
    rotation: z.number().finite().min(0).lt(360).optional(),
    scale: z.number().finite().min(0.5).max(2.5).optional(),
  })
  .superRefine((annotation, context) => {
    if (annotation.type === "signature") {
      const signature = signatureDataSchema.safeParse(annotation.value);
      if (!signature.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Signature annotation must contain a valid PNG data URL",
        });
      }
    }

    if (annotation.type === "text") {
      if (annotation.value.length > 5_000) {
        context.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: 5_000,
          inclusive: true,
          type: "string",
          path: ["value"],
          message: "Text annotation is too long",
        });
      }
      if (!/^#[0-9a-f]{6}$/i.test(annotation.color)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["color"],
          message: "Text annotation color must be a six-digit hex color",
        });
      }
    }

    if (annotation.type === "flag") {
      if (annotation.value.length > 12) {
        context.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: 12,
          inclusive: true,
          type: "string",
          path: ["value"],
          message: "Flag label is too long",
        });
      }
      if (!flagColorSchema.safeParse(annotation.color).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["color"],
          message: "Flag color is invalid",
        });
      }
    }
  });

const annotationsSchema = z
  .array(annotationSchema)
  .max(MAX_ANNOTATIONS)
  .superRefine((annotations, context) => {
    const valueLength = annotations.reduce(
      (total, annotation) => total + annotation.value.length,
      0,
    );
    if (valueLength > MAX_ANNOTATION_VALUE_TOTAL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Combined annotation data is too large",
      });
    }
  });

export const formValueSchema = z.union([
  z.string().max(10_000),
  z.boolean(),
  z.array(z.string().max(1_000)).max(100),
]);

const formValuesSchema = z
  .record(z.string().min(1).max(200), formValueSchema)
  .superRefine((formValues, context) => {
    const entries = Object.entries(formValues);
    const valueLength = entries.reduce((total, [, value]) => {
      if (typeof value === "boolean") return total;
      if (typeof value === "string") return total + value.length;
      return total + value.reduce((sum, item) => sum + item.length, 0);
    }, 0);

    if (entries.length > MAX_FORM_FIELDS || valueLength > MAX_FORM_VALUE_TOTAL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form data is too large",
      });
    }
  });

export const exportSchema = z.object({
  documentPath: z.string().trim().min(1).max(500),
  annotations: annotationsSchema,
  formValues: formValuesSchema.optional(),
  flatten: z.boolean().optional(),
  action: z.enum(["download", "email"]),
  emailTo: z.string().email().optional(),
  emailSubject: z.string().max(200).optional(),
  emailMessage: z.string().max(2000).optional(),
});

export type ExportInput = z.infer<typeof exportSchema>;

export const draftSchema = z.object({
  documentPath: z.string().trim().min(1).max(500),
  documentId: z.string().max(100).optional().nullable(),
  documentName: z.string().trim().min(1).max(255),
  annotations: z.object({
    version: z.literal(1),
    documentPath: z.string().trim().min(1).max(500),
    annotations: annotationsSchema,
    selectedContactId: z.string().max(100).nullable(),
    lastModified: z.string().datetime(),
  }),
});

export type DraftInput = z.infer<typeof draftSchema>;

export const documentFavoriteSchema = z.object({
  documentPath: z.string().trim().min(1).max(500),
  documentId: z.string().max(100).optional().nullable(),
  documentName: z.string().trim().min(1).max(255),
});

export type DocumentFavoriteInput = z.infer<typeof documentFavoriteSchema>;
