"use client";

import { useEffect, useRef } from "react";

/** Progressive enhancement: content stays visible without JavaScript or motion. */
export default function HomeScrollMotion() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = marker.current?.closest(".drivio-home");
    if (!root || !("IntersectionObserver" in window)) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();
    const targets = [
      ".home-discovery", ".home-lifestyle", ".home-recommended",
      ".auction-layout", ".home-parts-services", ".home-selling-finance",
      ".home-benefits", ".home-stats", ".home-testimonials", ".home-support",
    ].join(", ");

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        seen.add(entry.target);
        if (preference.matches || entry.target.contains(document.activeElement)) continue;
        const animation = entry.target.animate([
          { opacity: 0.65 },
          { opacity: 1 },
        ], { duration: 280, easing: "ease-out" });
        animations.set(entry.target, animation);
        animation.onfinish = () => animations.delete(entry.target);
      }
    }, { threshold: 0, rootMargin: "0px 0px 40px 0px" });

    function register() {
      root!.querySelectorAll(targets).forEach(target => {
        if (seen.has(target)) return;
        const rect = target.getBoundingClientRect();
        // Leave the initial viewport and already passed content undisturbed.
        if (preference.matches || rect.top < window.innerHeight + 40) seen.add(target);
        else observer.observe(target);
      });
    }
    function stopMotion() {
      if (!preference.matches) return;
      animations.forEach(animation => animation.cancel());
      animations.clear();
      observer.disconnect();
    }
    function revealFocused(event: Event) {
      animations.forEach((animation, target) => {
        if (target.contains(event.target as Node)) {
          animation.cancel();
          animations.delete(target);
        }
      });
    }

    register();
    // Keep dynamically inserted sections covered by the same shared observer.
    const mutations = new MutationObserver(register);
    mutations.observe(root, { childList: true, subtree: true });
    preference.addEventListener("change", stopMotion);
    root.addEventListener("focusin", revealFocused);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach(animation => animation.cancel());
      preference.removeEventListener("change", stopMotion);
      root.removeEventListener("focusin", revealFocused);
    };
  }, []);

  return <span ref={marker} hidden aria-hidden="true" />;
}
