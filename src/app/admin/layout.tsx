import { requireAdmin } from "@/lib/admin";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/layout/skip-link";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminToastProvider } from "@/components/admin/admin-toast";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <SkipLink />
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10">
          <AdminToastProvider>
            <div className="max-w-7xl">{children}</div>
          </AdminToastProvider>
        </main>
      </div>
    </div>
  );
}
