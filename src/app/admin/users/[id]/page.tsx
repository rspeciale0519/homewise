import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/ui/back-button";
import { UserRoleControl } from "@/components/admin/user-role-control";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile: adminProfile } = await requireAdmin();
  const { id } = await params;

  const user = await prisma.userProfile.findUnique({ where: { id } });
  if (!user) notFound();

  const [favoritesCount, searchesCount, alertsCount] = await Promise.all([
    prisma.favoriteProperty.count({ where: { userId: id } }),
    prisma.savedSearch.count({ where: { userId: id } }),
    prisma.propertyAlert.count({ where: { userId: id } }),
  ]);

  const isSelf = adminProfile.id === user.id;

  return (
    <div className="max-w-5xl">
      <BackButton
        fallbackHref="/admin/users"
        label="Back to Users"
        className="mb-6"
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-lg font-semibold text-navy-700">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-navy-700">{user.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Joined</p>
              <p className="text-navy-700">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Activity</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl font-bold text-navy-700">{favoritesCount}</p>
                <p className="text-[10px] text-slate-500 font-medium">Favorites</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl font-bold text-navy-700">{searchesCount}</p>
                <p className="text-[10px] text-slate-500 font-medium">Saved Searches</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl font-bold text-navy-700">{alertsCount}</p>
                <p className="text-[10px] text-slate-500 font-medium">Alerts</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Role</p>
            <UserRoleControl
              userId={user.id}
              currentRole={user.role}
              isSelf={isSelf}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
