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
  className?: string;
}

export function ServiceGrid({ items, columns = 3, className }: ServiceGridProps) {
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
