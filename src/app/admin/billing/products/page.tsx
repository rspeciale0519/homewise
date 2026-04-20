import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { ProductManagement } from "@/components/admin/billing/product-management";

export const metadata: Metadata = { title: "Plans & Add-ons — Admin Billing" };

export default async function ProductsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Plans &amp; Add-ons
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Manage subscription products, pricing, and feature assignments.
      </p>

      <ProductManagement />
    </div>
  );
}
