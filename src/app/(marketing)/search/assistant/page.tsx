import type { Metadata } from "next";
import { SearchAssistant } from "./search-assistant";

export const metadata: Metadata = {
  title: "AI Search Assistant — Homewise FL",
  description: "Use natural language to search for your perfect home in Central Florida",
};

export default function SearchAssistantPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-3">
          AI Home Search Assistant
        </h1>
        <p className="text-slate-500">
          Describe what you&apos;re looking for in natural language and our AI will find matching homes.
        </p>
      </div>
      <SearchAssistant />
    </div>
  );
}
