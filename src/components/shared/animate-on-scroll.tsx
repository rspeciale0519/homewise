"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useHasMounted } from "@/hooks/use-has-mounted";

interface AnimateOnScrollProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  threshold?: number;
  className?: string;
}

export function AnimateOnScroll({
  children,
  delay = 0,
  duration = 0.5,
  threshold = 0.2,
  className,
}: AnimateOnScrollProps) {
  const hasMounted = useHasMounted();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = hasMounted && Boolean(prefersReducedMotion);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : undefined}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={shouldReduceMotion ? undefined : { once: true, amount: threshold }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
