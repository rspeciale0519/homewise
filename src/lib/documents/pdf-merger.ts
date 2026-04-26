import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFFont,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  rgb,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import path from "path";
import type {
  Annotation,
  AnnotationFontFamily,
  FormValues,
} from "@/types/document-viewer";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

const EMBEDDED_FONT_FILES: Partial<Record<AnnotationFontFamily, string>> = {
  Roboto: "Roboto-Regular.ttf",
  SourceSerif: "SourceSerif-Regular.ttf",
  SourceSans: "SourceSans-Regular.ttf",
};

async function loadFont(
  pdfDoc: PDFDocument,
  family: AnnotationFontFamily
): Promise<PDFFont> {
  if (family === "Helvetica") {
    return pdfDoc.embedStandardFont(StandardFonts.Helvetica);
  }
  if (family === "Times") {
    return pdfDoc.embedStandardFont(StandardFonts.TimesRoman);
  }
  const filename = EMBEDDED_FONT_FILES[family];
  if (!filename) {
    return pdfDoc.embedStandardFont(StandardFonts.Helvetica);
  }
  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "annotations",
    filename
  );
  const bytes = await readFile(fontPath);
  return pdfDoc.embedFont(bytes, { subset: true });
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
  pdfDoc.registerFontkit(fontkit);

  if (formValues && Object.keys(formValues).length > 0) {
    applyFormValues(pdfDoc, formValues);
  }

  const pages = pdfDoc.getPages();
  const fontCache = new Map<AnnotationFontFamily, PDFFont>();

  for (const annotation of annotations) {
    const page = pages[annotation.pageIndex];
    if (!page) continue;

    if (annotation.type === "text") {
      const family: AnnotationFontFamily = annotation.fontFamily ?? "Helvetica";
      let font = fontCache.get(family);
      if (!font) {
        font = await loadFont(pdfDoc, family);
        fontCache.set(family, font);
      }
      page.drawText(annotation.value, {
        x: annotation.pdfX,
        y: annotation.pdfY,
        size: annotation.fontSize,
        font,
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
