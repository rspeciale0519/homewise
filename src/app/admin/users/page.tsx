import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UserManagementTable } from "@/components/admin/user-management-table";

export default async function AdminUsersPage() {
  await requireAdmin();

  const [users, total] = await Promise.all([
    prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.userProfile.count(),
  ]);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Users
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Manage user accounts and roles.
      </p>

      <UserManagementTable
        initialUsers={JSON.parse(JSON.stringify(users))}
        initialTotal={total}
      />
    </div>
  );
}
