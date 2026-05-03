import { dispatchMailOrderOnce } from "@/lib/direct-mail/dispatch";
import { prisma } from "@/lib/prisma";

async function main() {
  const pending = await prisma.mailOrder.findMany({
    where: { status: "submitted", emailStatus: { in: ["pending", "failed"] } },
    select: { id: true, emailStatus: true, submittedAt: true },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  if (pending.length === 0) {
    console.log("No pending or failed orders to dispatch.");
    return;
  }

  console.log(`Dispatching ${pending.length} order(s)...`);
  for (const o of pending) {
    console.log(`\n  ${o.id} (was ${o.emailStatus})`);
    const result = await dispatchMailOrderOnce(o.id, "admin_retry");
    if (result.success) {
      console.log(`    ✓ sent — messageId=${result.messageId}`);
    } else {
      console.log(`    ✗ failed — ${result.error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
