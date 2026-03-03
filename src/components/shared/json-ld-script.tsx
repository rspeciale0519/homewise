import type { Thing, WithContext } from "schema-dts";

interface JsonLdScriptProps {
  data: WithContext<Thing> | WithContext<Thing>[];
}

// JSON-LD content is safe - it's generated from trusted server-side data only
// (constants, Prisma queries), never from user input. This is the standard
// Next.js pattern for structured data injection.
export function JsonLdScript({ data }: JsonLdScriptProps) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
