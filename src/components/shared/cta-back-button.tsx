"use client";

import { Button } from "@/components/ui/button";
import { useBackHandler } from "@/components/ui/back-button";

interface CtaBackButtonProps {
  fallbackHref: string;
  label: string;
  variant: "primary" | "outline-white";
}

export function CtaBackButton({
  fallbackHref,
  label,
  variant,
}: CtaBackButtonProps) {
  const onClick = useBackHandler(fallbackHref);
  return (
    <Button variant={variant} size="lg" onClick={onClick}>
      {label}
    </Button>
  );
}
