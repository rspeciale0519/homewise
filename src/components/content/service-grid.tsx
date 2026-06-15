import { ServiceCard } from "./service-card";
import { cn } from "@/lib/utils";

interface ServiceItem {
  title: string;
  description: string;
  href: string;
  imageUrl: string;
  tag?: string;
}

interface ServiceGridProps {
  items: ServiceItem[];
  columns?: 2 | 3;
  /** Center the final (orphan) row instead of left-aligning it. */
  center?: boolean;
  className?: string;
}

export function ServiceGrid({ items, columns = 3, center = false, className }: ServiceGridProps) {
  if (center) {
    const itemWidth =
      columns === 3
        ? "w-full sm:w-[calc(50%_-_0.75rem)] lg:w-[calc(33.333%_-_1rem)]"
        : "w-full sm:w-[calc(50%_-_0.75rem)]";
    return (
      <div className={cn("flex flex-wrap justify-center gap-6", className)}>
        {items.map((item) => (
          <div key={item.href} className={itemWidth}>
            <ServiceCard {...item} className="h-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        columns === 2 && "lg:grid-cols-2",
        className
      )}
    >
      {items.map((item) => (
        <ServiceCard key={item.href} {...item} />
      ))}
    </div>
  );
}
