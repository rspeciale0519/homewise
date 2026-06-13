import { createAdminClient } from "../src/lib/supabase/admin";
import { prisma } from "../src/lib/prisma";

const PASSWORD = "E2eSmoke!2026-homewise";

const ACCOUNTS = [
  { email: "e2e-buyer@example.com", role: "user", firstName: "E2E", lastName: "Buyer" },
  { email: "e2e-agent@example.com", role: "agent", firstName: "E2E", lastName: "TestAgent" },
  { email: "e2e-admin@example.com", role: "admin", firstName: "E2E", lastName: "Admin" },
] as const;

async function main() {
  const admin = createAdminClient();

  for (const acct of ACCOUNTS) {
    let userId: string | undefined;
    const { data: created, error } = await admin.auth.admin.createUser({
      email: acct.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => u.email === acct.email);
      if (!existing) {
        console.log(`ERROR creating ${acct.email}: ${error.message}`);
        continue;
      }
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
      console.log(`${acct.email}: auth user existed (${userId}), password reset`);
    } else {
      userId = created.user.id;
      console.log(`${acct.email}: auth user created (${userId})`);
    }

    await prisma.userProfile.upsert({
      where: { id: userId },
      update: { role: acct.role, email: acct.email },
      create: {
        id: userId,
        email: acct.email,
        firstName: acct.firstName,
        lastName: acct.lastName,
        role: acct.role,
      },
    });
    console.log(`${acct.email}: profile upserted with role=${acct.role}`);

    if (acct.role === "agent") {
      const agent = await prisma.agent.upsert({
        where: { slug: "e2e-test-agent" },
        update: { userId },
        create: {
          firstName: acct.firstName,
          lastName: acct.lastName,
          slug: "e2e-test-agent",
          email: acct.email,
          active: false,
          languages: [],
          designations: [],
          userId,
        },
      });
      console.log(`${acct.email}: agent row linked (${agent.id}, active=false to stay out of public directory)`);
    }
  }
  await prisma.$disconnect();
}

main();
