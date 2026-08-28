import { z } from "zod";
import {
  ACCEPTED_ARTWORK_MIME,
  MAIL_CLASSES,
  MAX_ARTWORK_BYTES,
  MAX_ARTWORK_FILES_PER_ORDER,
  MAX_LIST_BYTES,
  MAX_LIST_FILES_PER_ORDER,
  MAX_LIST_ROWS,
  PRODUCT_TYPES,
  WORKFLOWS,
  earliestDropDate,
} from "./constants";

const trimmedString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max);

export const artworkFileSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  name: trimmedString(120).min(1, "Description is required"),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  byteSize: z.number().int().positive().max(MAX_ARTWORK_BYTES),
  mimeType: z.string().refine(
    (value) =>
      ACCEPTED_ARTWORK_MIME.includes(
        value as (typeof ACCEPTED_ARTWORK_MIME)[number],
      ),
    { message: "Unsupported artwork file type" },
  ),
  warnings: z.array(z.string().max(500)).max(20),
}).strict();
export type ArtworkFileInput = z.infer<typeof artworkFileSchema>;

export const artworkFilesArraySchema = z
  .array(artworkFileSchema)
  .min(1, "Upload at least one artwork file")
  .max(
    MAX_ARTWORK_FILES_PER_ORDER,
    `At most ${MAX_ARTWORK_FILES_PER_ORDER} artwork files per order`,
  );

export const listFileSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  name: trimmedString(120).min(1, "Description is required"),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  byteSize: z.number().int().positive().max(MAX_LIST_BYTES),
  rowCount: z.number().int().nonnegative().max(MAX_LIST_ROWS),
  columns: z.array(z.string().max(300)).min(1).max(500),
  fillPercent: z.record(z.string().max(300), z.number().min(0).max(100)),
  excludedColumns: z.array(z.string().max(300)).max(500),
  warnings: z.array(z.string().max(500)).max(20),
}).strict();
export type ListFileInput = z.infer<typeof listFileSchema>;

export const listFilesArraySchema = z
  .array(listFileSchema)
  .min(1, "Upload at least one mailing list")
  .max(
    MAX_LIST_FILES_PER_ORDER,
    `At most ${MAX_LIST_FILES_PER_ORDER} mailing lists per order`,
  )
  .refine(
    (lists) =>
      lists.every(
        (l) => l.columns.length - l.excludedColumns.length >= 1,
      ),
    { message: "Each list must keep at least one column" },
  );

export const returnAddressSchema = z.object({
  name: trimmedString(120).min(1, "Name is required"),
  address1: trimmedString(200).min(1, "Address is required"),
  address2: trimmedString(200).optional().nullable(),
  city: trimmedString(120).min(1, "City is required"),
  state: trimmedString(2).min(2, "Use the 2-letter state code").max(2, "Use the 2-letter state code"),
  zip: trimmedString(10).min(5, "ZIP must be at least 5 digits"),
}).strict();
export type ReturnAddress = z.infer<typeof returnAddressSchema>;

export const stepBasicsSchema = z.object({
  workflow: z.enum(WORKFLOWS),
  subjectPropertyAddress: trimmedString(300).optional().nullable(),
  campaignName: trimmedString(120).optional().nullable(),
}).strict();
export type StepBasicsInput = z.infer<typeof stepBasicsSchema>;

export const stepSpecSchema = z.object({
  productType: z.enum(PRODUCT_TYPES),
  productSize: trimmedString(120).min(1, "Choose a size"),
  mailClass: z.enum(MAIL_CLASSES),
  dropDate: z
    .string()
    .min(1, "Pick a target drop date")
    .refine(
      (s) => {
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return false;
        const earliest = earliestDropDate();
        earliest.setHours(0, 0, 0, 0);
        return d.getTime() >= earliest.getTime();
      },
      { message: "Drop date must allow at least the minimum lead time" },
    ),
  returnAddress: returnAddressSchema,
  specialInstructions: trimmedString(2000).optional().nullable(),
}).strict();
export type StepSpecInput = z.infer<typeof stepSpecSchema>;

export const stepArtworkSchema = z.object({
  artworkFiles: artworkFilesArraySchema,
}).strict();
export type StepArtworkInput = z.infer<typeof stepArtworkSchema>;

export const stepListSchema = z.object({
  listFiles: listFilesArraySchema,
}).strict();
export type StepListInput = z.infer<typeof stepListSchema>;

export const stepReviewSchema = z.object({
  complianceConfirmed: z
    .boolean()
    .refine((v) => v === true, { message: "Confirm compliance to submit" }),
}).strict();
export type StepReviewInput = z.infer<typeof stepReviewSchema>;

export const orderDraftCreateSchema = z.object({
  workflow: z.enum(WORKFLOWS),
}).strict();
export type OrderDraftCreateInput = z.infer<typeof orderDraftCreateSchema>;

export const orderDraftPatchSchema = z.object({
  currentStep: z.number().int().min(1).max(5).optional(),
  workflow: z.enum(WORKFLOWS).optional(),
  subjectPropertyAddress: trimmedString(300).optional().nullable(),
  campaignName: trimmedString(120).optional().nullable(),
  productType: z.enum(PRODUCT_TYPES).optional().nullable(),
  productSize: trimmedString(120).optional().nullable(),
  mailClass: z.enum(MAIL_CLASSES).optional().nullable(),
  dropDate: z.string().optional().nullable(),
  returnAddress: returnAddressSchema.optional().nullable(),
  quantity: z.number().int().nonnegative().max(MAX_LIST_ROWS * MAX_LIST_FILES_PER_ORDER).optional(),
  specialInstructions: trimmedString(2000).optional().nullable(),
  artworkFiles: z
    .array(artworkFileSchema)
    .max(MAX_ARTWORK_FILES_PER_ORDER)
    .optional(),
  listFiles: z
    .array(listFileSchema)
    .max(MAX_LIST_FILES_PER_ORDER)
    .optional(),
  complianceConfirmed: z.boolean().optional(),
}).strict();
export type OrderDraftPatchInput = z.infer<typeof orderDraftPatchSchema>;

export const orderSubmitSchema = stepBasicsSchema
  .merge(stepSpecSchema)
  .merge(stepArtworkSchema)
  .merge(stepListSchema)
  .merge(stepReviewSchema);
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;
