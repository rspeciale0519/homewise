import { PDFDocument, rgb } from "pdf-lib";
import type { Annotation } from "@/types/document-viewer";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export async function mergePdfWithAnnotations(
  pdfBuffer: Buffer,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
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

  return pdfDoc.save();
}
