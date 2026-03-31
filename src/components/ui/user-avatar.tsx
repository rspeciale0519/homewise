import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  size: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CONFIG = {
  sm: { container: "h-9 w-9 rounded-lg", text: "text-xs", px: 36 },
  md: { container: "h-12 w-12 rounded-xl", text: "text-sm", px: 48 },
  lg: { container: "h-24 w-24 rounded-2xl", text: "text-2xl", px: 96 },
} as const;

export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  size,
  className,
}: UserAvatarProps) {
  const config = SIZE_CONFIG[size];
  const initials = getInitials(firstName, lastName);

  if (avatarUrl) {
    return (
      <div
        className={cn(
          config.container,
          "relative overflow-hidden flex-shrink-0",
          className
        )}
      >
        <Image
          src={avatarUrl}
          alt={`${firstName} ${lastName}`.trim()}
          fill
          className="object-cover"
          sizes={`${config.px}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        config.container,
        "bg-navy-600 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm",
        config.text,
        className
      )}
    >
      {initials}
    </div>
  );
}

function getInitials(first: string, last: string): string {
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (first) return first.charAt(0).toUpperCase();
  return "U";
}
