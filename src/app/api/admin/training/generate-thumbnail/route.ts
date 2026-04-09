import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 360;

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const { fileKey } = body as { fileKey: string };

  if (!fileKey) {
    return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("training-files")
    .download(fileKey);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: "Failed to download PDF", details: downloadError?.message },
      { status: 500 },
    );
  }

  try {
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const page = await doc.getPage(1);

    const scale = THUMBNAIL_WIDTH / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });

    const { createCanvas } = await import("canvas");
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs RenderParameters typing mismatch with node-canvas
    await (page.render as any)({
      canvasContext: context,
      viewport,
    }).promise;

    const pngBuffer = canvas.toBuffer("image/png");
    const webpBuffer = await sharp(pngBuffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbPath = `thumbnails/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from("training-thumbnails")
      .upload(thumbPath, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload thumbnail", details: uploadError.message },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage
      .from("training-thumbnails")
      .getPublicUrl(thumbPath);

    await doc.destroy();

    return NextResponse.json({ thumbnailUrl: urlData.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate thumbnail", details: (err as Error).message },
      { status: 500 },
    );
  }
}
