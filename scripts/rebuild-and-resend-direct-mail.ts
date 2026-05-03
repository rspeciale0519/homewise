import { prisma } from "@/lib/prisma";
import { buildOrderBundle } from "@/lib/direct-mail/bundle";
import { dispatchMailOrderOnce } from "@/lib/direct-mail/dispatch";
import type { ArtworkFile, ListFile } from "@/lib/direct-mail/types";

async function main() {
  const submitted = await prisma.mailOrder.findFirst({
    where: { status: "submitted" },
    orderBy: { submittedAt: "desc" },
  });
  if (!submitted) {
    console.log("No submitted orders.");
    return;
  }
  if (!submitted.summaryPdfKey) {
    console.log("Order has no summaryPdfKey; cannot bundle.");
    return;
  }

  const artworkFiles = Array.isArray(submitted.artworkFiles)
    ? (submitted.artworkFiles as unknown as ArtworkFile[])
    : [];
  const listFiles = Array.isArray(submitted.listFiles)
    ? (submitted.listFiles as unknown as ListFile[])
    : [];

  console.log(`Building ZIP bundle for ${submitted.id}...`);
  await buildOrderBundle({
    orderId: submitted.id,
    summaryPdfKey: submitted.summaryPdfKey,
    artworkFiles,
    listFiles: listFiles.map((l) => ({
      name: l.name,
      fileKey: l.fileKey,
      fileName: l.fileName,
    })),
  });
  console.log("✓ Bundle built");

  console.log("Marking emailStatus=pending and re-dispatching...");
  await prisma.mailOrder.update({
    where: { id: submitted.id },
    data: { emailStatus: "pending" },
  });
  const r = await dispatchMailOrderOnce(submitted.id, "admin_retry");
  console.log("Result:", r);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
