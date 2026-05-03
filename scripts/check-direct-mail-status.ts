import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.mailOrder.findMany({
    where: { status: "submitted" },
    orderBy: { submittedAt: "desc" },
    take: 5,
    include: {
      dispatchLogs: { orderBy: { attemptedAt: "desc" }, take: 3 },
      user: { select: { email: true } },
    },
  });

  for (const o of orders) {
    console.log(`\nOrder ${o.id}`);
    console.log(`  agent: ${o.user?.email}`);
    console.log(`  submitted: ${o.submittedAt?.toISOString()}`);
    console.log(`  status: ${o.status}`);
    console.log(`  emailStatus: ${o.emailStatus}`);
    console.log(`  dispatchAttempts: ${o.dispatchAttempts}`);
    console.log(`  lastDispatchedAt: ${o.lastDispatchedAt?.toISOString() ?? "—"}`);
    console.log(`  emailMessageId: ${o.emailMessageId ?? "—"}`);
    console.log(`  dispatchLogs:`);
    if (o.dispatchLogs.length === 0) {
      console.log(`    (none — Inngest function never ran)`);
    } else {
      for (const log of o.dispatchLogs) {
        console.log(`    - ${log.attemptedAt.toISOString()} success=${log.success} ${log.errorMessage ?? log.emailMessageId ?? ""}`);
      }
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
