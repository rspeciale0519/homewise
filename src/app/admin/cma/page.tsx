import { requireAdmin } from "@/lib/admin";
import { CmaToolView } from "./cma-tool-view";

export const metadata = { title: "CMA Tool — Homewise Admin" };

export default async function CmaToolPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Comparative Market Analysis
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Generate AI-powered CMA reports for any property, then export as PDF.
      </p>
      <CmaToolView />
    </div>
  );
}
