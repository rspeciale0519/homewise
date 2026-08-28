"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useHasMounted } from "@/hooks/use-has-mounted";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const reducedContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0 } },
};

const reducedItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
}

export function StaggerChildren({ children, className }: StaggerChildrenProps) {
  const hasMounted = useHasMounted();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = hasMounted && Boolean(prefersReducedMotion);

  return (
    <motion.div
      initial="hidden"
      animate={shouldReduceMotion ? "visible" : undefined}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={shouldReduceMotion ? undefined : { once: true, amount: 0.2 }}
      variants={shouldReduceMotion ? reducedContainerVariants : containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerChildrenProps) {
  const hasMounted = useHasMounted();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = hasMounted && Boolean(prefersReducedMotion);

  return (
    <motion.div variants={shouldReduceMotion ? reducedItemVariants : itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
