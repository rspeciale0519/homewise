import type { ResourceCategory } from "@/data/content/agent-resources";

interface DocumentListProps {
  categories: ResourceCategory[];
}

export function DocumentList({ categories }: DocumentListProps) {
  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category.title}>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-1.5 w-1.5 rounded-full bg-crimson-600" />
            <h2 className="font-serif text-xl font-semibold text-navy-700">
              {category.title}
            </h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {category.documents.length}
            </span>
          </div>
          <div className="grid gap-2">
            {category.documents.map((doc) => {
              const isExternal = doc.external === true;
              return (
              <a
                key={doc.name}
                href={doc.url}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-crimson-200 hover:bg-crimson-50/30 transition-all duration-200"
              >
                {/* File icon */}
                <div className="shrink-0 mt-0.5">
                  <div className="h-9 w-9 rounded-lg bg-navy-50 group-hover:bg-crimson-100 flex items-center justify-center transition-colors">
                    {doc.url.endsWith(".pdf") || doc.url.endsWith(".docx") ? (
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-700 group-hover:text-crimson-700 transition-colors">
                    {doc.name}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Download/external arrow */}
                <div className="shrink-0 mt-1">
                  {isExternal ? (
                    <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 transition-all group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                </div>
              </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
