import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFFont,
  PDFOptionList,
  PDFPage,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import path from "path";
import {
  FLAG_BASE_HEIGHT,
  FLAG_BASE_WIDTH,
  FLAG_BODY_RADIUS,
  FLAG_DEFAULT_ROTATION,
  FLAG_DEFAULT_SCALE,
  FLAG_NOTCH_WIDTH,
  flagColorHex,
} from "@/lib/documents/flag-colors";
import type {
  Annotation,
  AnnotationFontFamily,
  FlagColor,
  FormValues,
} from "@/types/document-viewer";

const FLAG_KNOWN_COLORS = new Set<string>([
  "yellow", "blue", "green", "red", "purple", "orange",
]);

function isFlagColor(value: string): value is FlagColor {
  return FLAG_KNOWN_COLORS.has(value);
}

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
  let flagFont: PDFFont | null = null;

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
    } else if (annotation.type === "flag") {
      if (!flagFont) {
        flagFont = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
      }
      drawFlag(page, annotation, flagFont);
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

function drawFlag(page: PDFPage, ann: Annotation, font: PDFFont) {
  const scale = ann.scale ?? FLAG_DEFAULT_SCALE;
  const rotationBrowser = ann.rotation ?? FLAG_DEFAULT_ROTATION;
  const colorKey: FlagColor = isFlagColor(ann.color) ? ann.color : "yellow";

  const baseW = FLAG_BASE_WIDTH * scale;
  const baseH = FLAG_BASE_HEIGHT * scale;
  const notchW = FLAG_NOTCH_WIDTH * scale;
  const r = FLAG_BODY_RADIUS * scale;
  const labelSize = 11 * scale;

  // ann.pdfX/pdfY is the body's geometric center. The path is drawn with
  // body center at SVG (0, 0) so rotation around the body center is just
  // pdf-lib's built-in rotate-around-(x,y) when (x, y) = body center.
  // Body spans x in [-baseW/2, baseW/2]; notch from x=baseW/2 to baseW/2+notchW.
  const flagPath =
    `M ${-baseW / 2 + r} ${-baseH / 2} ` +
    `L ${baseW / 2} ${-baseH / 2} ` +
    `L ${baseW / 2 + notchW} 0 ` +
    `L ${baseW / 2} ${baseH / 2} ` +
    `L ${-baseW / 2 + r} ${baseH / 2} ` +
    `Q ${-baseW / 2} ${baseH / 2} ${-baseW / 2} ${baseH / 2 - r} ` +
    `L ${-baseW / 2} ${-baseH / 2 + r} ` +
    `Q ${-baseW / 2} ${-baseH / 2} ${-baseW / 2 + r} ${-baseH / 2} ` +
    `Z`;

  // PDF rotation is CCW positive; CSS browser rotation is CW positive.
  const pdfRotation = -rotationBrowser;

  page.drawSvgPath(flagPath, {
    x: ann.pdfX,
    y: ann.pdfY,
    rotate: degrees(pdfRotation),
    color: hexToRgb(flagColorHex(colorKey)),
  });

  // Label: centered at the body center, which is (ann.pdfX, ann.pdfY).
  const labelText = ann.value.toUpperCase();
  const textWidth = font.widthOfTextAtSize(labelText, labelSize);
  const textHeight = font.heightAtSize(labelSize);

  const angleRad = (pdfRotation * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Bottom-left of text such that its center lands at (pdfX, pdfY).
  const offX = -textWidth / 2;
  const offY = -textHeight / 3;
  const blX = ann.pdfX + offX * cos - offY * sin;
  const blY = ann.pdfY + offX * sin + offY * cos;

  page.drawText(labelText, {
    x: blX,
    y: blY,
    size: labelSize,
    font,
    color: rgb(1, 1, 1),
    rotate: degrees(pdfRotation),
  });
}
