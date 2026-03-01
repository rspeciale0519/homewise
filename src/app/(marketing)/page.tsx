import type { Metadata } from "next";
import { SITE_NAME, DESCRIPTION } from "@/lib/constants";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: DESCRIPTION,
};

export default function HomePage() {
  return (
    <div>
      <section className="py-32 text-center">
        <h1 className="font-serif text-6xl text-navy-700 mb-4">Your Home. Your Future.</h1>
        <p className="text-slate-500 text-lg">Homepage coming in Phase 3.</p>
      </section>
    </div>
  );
}
