import Link from "next/link";
import type { LibraryCategory } from "@/types/document-library";

interface DocumentListProps {
  categories: LibraryCategory[];
}

function documentExtension(
  doc: LibraryCategory["documents"][number],
): string {
  const source = doc.storageKey ?? doc.url ?? "";
  return source.toLowerCase().slice(source.lastIndexOf("."));
}

export function DocumentList({ categories }: DocumentListProps) {
  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category.id}>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-1.5 w-1.5 rounded-full bg-crimson-600" />
            <h2 className="font-serif text-xl font-semibold text-navy-700">
              {category.title}
            </h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {category.documents.length}
            </span>
          </div>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {category.documents.map((doc) => {
              const ext = documentExtension(doc);
              const isExternal = doc.external;
              const viewerUrl = doc.viewable
                ? `/dashboard/documents/viewer?slug=${encodeURIComponent(doc.slug)}`
                : null;
              const directDownloadUrl = !isExternal
                ? `/api/documents/by-slug/${encodeURIComponent(doc.slug)}`
                : doc.url ?? "#";

              const cardClasses =
                "group flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-crimson-200 hover:bg-crimson-50/30 transition-all duration-200";

              const inner = (
                <>
                  <div className="shrink-0 mt-0.5">
                    <div className="h-9 w-9 rounded-lg bg-navy-50 group-hover:bg-crimson-100 flex items-center justify-center transition-colors">
                      {ext === ".pdf" || ext === ".docx" ? (
                        <svg className="h-4.5 w-4.5 text-navy-400 group-hover:text-crimson-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      ) : (
                        <svg className="h-4.5 w-4.5 text-navy-400 group-hover:text-crimson-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-700 group-hover:text-crimson-700 transition-colors">
                      {doc.name}
                    </p>
                    {doc.description && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 mt-1">
                    {isExternal ? (
                      <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    ) : viewerUrl ? (
                      <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 transition-all group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                  </div>
                </>
              );

              if (viewerUrl) {
                return (
                  <Link key={doc.id} href={viewerUrl} className={cardClasses}>
                    {inner}
                  </Link>
                );
              }

              return (
                <a
                  key={doc.id}
                  href={directDownloadUrl}
                  {...(isExternal
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : { download: true })}
                  className={cardClasses}
                >
                  {inner}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
