import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  rgb,
} from "pdf-lib";
import type { Annotation, FormValues } from "@/types/document-viewer";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function applyFormValues(pdfDoc: PDFDocument, formValues: FormValues) {
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(formValues)) {
    const field = form.getFieldMaybe(name);
    if (!field) continue;

    try {
      if (field instanceof PDFTextField) {
        field.setText(typeof value === "string" ? value : String(value ?? ""));
      } else if (field instanceof PDFCheckBox) {
        const checked =
          value === true ||
          (typeof value === "string" && value !== "" && value !== "Off");
        if (checked) field.check();
        else field.uncheck();
      } else if (field instanceof PDFRadioGroup) {
        if (typeof value === "string" && value.length > 0 && value !== "Off") {
          field.select(value);
        }
      } else if (field instanceof PDFDropdown) {
        if (typeof value === "string" && value.length > 0) field.select(value);
        else if (Array.isArray(value) && value.length > 0) field.select(value);
      } else if (field instanceof PDFOptionList) {
        if (Array.isArray(value)) field.select(value);
        else if (typeof value === "string" && value.length > 0) field.select(value);
      }
    } catch {
      // Skip fields we can't set (e.g., type mismatch, locked)
    }
  }
}

export async function mergePdfWithAnnotations(
  pdfBuffer: Buffer,
  annotations: Annotation[],
  formValues?: FormValues,
  flatten?: boolean
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  if (formValues && Object.keys(formValues).length > 0) {
    applyFormValues(pdfDoc, formValues);
  }

  const pages = pdfDoc.getPages();

  for (const annotation of annotations) {
    const page = pages[annotation.pageIndex];
    if (!page) continue;

    if (annotation.type === "text") {
      page.drawText(annotation.value, {
        x: annotation.pdfX,
        y: annotation.pdfY,
        size: annotation.fontSize,
        color: hexToRgb(annotation.color),
      });
    } else if (annotation.type === "signature") {
      const base64Data = annotation.value.replace(
        /^data:image\/png;base64,/,
        ""
      );
      const imageBytes = Buffer.from(base64Data, "base64");
      const pngImage = await pdfDoc.embedPng(imageBytes);

      const width = annotation.width ?? 150;
      const height = annotation.height ?? 60;

      page.drawImage(pngImage, {
        x: annotation.pdfX,
        y: annotation.pdfY,
        width,
        height,
      });
    }
  }

  if (flatten) {
    try {
      pdfDoc.getForm().flatten();
    } catch {
      // No form or already flattened — safe to ignore
    }
  }

  return pdfDoc.save();
}
