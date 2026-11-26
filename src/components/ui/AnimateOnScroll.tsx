"use client";

import { useEffect, useRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  revealClass?: string;
  threshold?: number;
  once?: boolean;
}

export function AnimateOnScroll({
  children,
  className,
  revealClass = "reveal",
  threshold = 0.12,
  once = true,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove("is-visible");
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return (
    <div ref={ref} className={cn(revealClass, className)}>
      {children}
    </div>
  );
}

/* Convenience wrappers */
export function RevealLeft({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <AnimateOnScroll revealClass="reveal-left" className={className}>
      {children}
    </AnimateOnScroll>
  );
}

export function RevealRight({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <AnimateOnScroll revealClass="reveal-right" className={className}>
      {children}
    </AnimateOnScroll>
  );
}

export function RevealStagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <AnimateOnScroll revealClass="reveal reveal-stagger" className={className}>
      {children}
    </AnimateOnScroll>
  );
}
