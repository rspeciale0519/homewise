import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { CtaBackButton } from "@/components/shared/cta-back-button";

type PrimaryCta =
  | { label: string; href: string }
  | { label: string; fallbackHref: string };

interface CtaBannerProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: PrimaryCta;
  secondaryCta?: { label: string; href: string };
  variant?: "navy" | "crimson" | "light";
}

function isBackCta(
  cta: PrimaryCta,
): cta is { label: string; fallbackHref: string } {
  return "fallbackHref" in cta;
}

export function CtaBanner({
  eyebrow,
  title,
  subtitle,
  primaryCta = { label: "Get Started", href: "/contact" },
  secondaryCta,
  variant = "navy",
}: CtaBannerProps) {
  const bgMap = {
    navy: "bg-gradient-navy",
    crimson: "bg-crimson-600",
    light: "bg-cream-100 border-t border-cream-200",
  };

  const textMap = {
    navy: "text-white",
    crimson: "text-white",
    light: "text-navy-700",
  };

  const subMap = {
    navy: "text-slate-300",
    crimson: "text-crimson-100",
    light: "text-slate-500",
  };

  const eyebrowMap = {
    navy: "text-crimson-400",
    crimson: "text-crimson-200",
    light: "text-crimson-600",
  };

  const primaryButtonVariant =
    variant !== "light" ? "outline-white" : "primary";

  return (
    <section className={bgMap[variant]}>
      <Container className="py-16 md:py-20">
        <AnimateOnScroll>
        <div className="flex flex-col items-center text-center gap-6 md:flex-row md:text-left md:justify-between md:items-center">
          <div className="max-w-xl">
            {eyebrow && (
              <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-3 ${eyebrowMap[variant]}`}>
                {eyebrow}
              </p>
            )}
            <h2 className={`font-serif text-display-sm md:text-display-md font-semibold text-balance ${textMap[variant]}`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`mt-3 text-base leading-relaxed ${subMap[variant]}`}>{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {isBackCta(primaryCta) ? (
              <CtaBackButton
                fallbackHref={primaryCta.fallbackHref}
                label={primaryCta.label}
                variant={primaryButtonVariant}
              />
            ) : (
              <Link href={primaryCta.href}>
                <Button variant={primaryButtonVariant} size="lg">
                  {primaryCta.label}
                </Button>
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href}>
                <Button
                  variant={variant !== "light" ? "ghost" : "outline"}
                  size="lg"
                  className={variant !== "light" ? "text-white hover:bg-white/10" : ""}
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            )}
          </div>
        </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
