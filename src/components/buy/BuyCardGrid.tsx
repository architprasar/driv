"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function BuyCardGrid({ children, revision, list }: {
  children: ReactNode;
  revision: string;
  list: boolean;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const revealed = useRef(new WeakSet<Element>());

  useLayoutEffect(() => {
    if (!grid.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const root = grid.current;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".buy-vehicle-card"))
        .filter(card => !revealed.current.has(card));
      if (!cards.length) return;
      const tweens: gsap.core.Tween[] = [];
      let active = true;
      const reveal = (batch: Element[]) => {
        if (!active) return;
        const fresh = batch.filter(card => !revealed.current.has(card));
        if (!fresh.length) return;
        fresh.forEach(card => revealed.current.add(card));
        tweens.push(gsap.to(fresh, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "opacity,transform",
        }));
      };
      // Opacity, rather than visibility, keeps links keyboard-accessible.
      gsap.set(cards, { opacity: 0, y: 22 });
      const triggers = ScrollTrigger.batch(cards, {
        start: "top 94%",
        interval: 0.08,
        batchMax: 3,
        once: true,
        onEnter: reveal,
        onEnterBack: reveal,
      });
      const focus = (event: FocusEvent) => {
        const card = (event.target as HTMLElement).closest(".buy-vehicle-card");
        if (!card) return;
        revealed.current.add(card);
        gsap.killTweensOf(card);
        gsap.set(card, { clearProps: "opacity,transform" });
      };
      root.addEventListener("focusin", focus);
      return () => {
        active = false;
        triggers.forEach(trigger => trigger.kill());
        tweens.forEach(tween => tween.kill());
        root.removeEventListener("focusin", focus);
      };
    }, root);
    return () => media.revert();
  }, [revision, list]);

  return <div ref={grid} className={`buy-vehicle-grid ${list ? "is-list" : ""}`}>{children}</div>;
}
