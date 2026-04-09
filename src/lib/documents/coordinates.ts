import type { PageDimensions } from "@/types/document-viewer";

export function screenToPdf(
  clickX: number,
  clickY: number,
  dims: PageDimensions
): { pdfX: number; pdfY: number } {
  const scaleX = dims.pdfWidth / dims.renderWidth;
  const scaleY = dims.pdfHeight / dims.renderHeight;

  return {
    pdfX: Math.round(clickX * scaleX * 100) / 100,
    pdfY: Math.round((dims.pdfHeight - clickY * scaleY) * 100) / 100,
  };
}

export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  dims: PageDimensions
): { screenX: number; screenY: number } {
  const scaleX = dims.renderWidth / dims.pdfWidth;
  const scaleY = dims.renderHeight / dims.pdfHeight;

  return {
    screenX: pdfX * scaleX,
    screenY: (dims.pdfHeight - pdfY) * scaleY,
  };
}
