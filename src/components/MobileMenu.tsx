"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

const allLinks: NavLink[] = [
  { href: "/cars",             icon: "directions_car",           label: "Buy Used Car" },
  { href: "/sell",             icon: "sell",                     label: "Sell Your Car" },
  { href: "/auctions",         icon: "gavel",                    label: "Live Auctions" },
  { href: "/parts",            icon: "settings_input_component", label: "Parts Marketplace" },
  { href: "/valuation",        icon: "analytics",                label: "Value My Car" },
  { href: "/history", icon: "policy",                   label: "RC & History Check" },
  { href: "/challan",          icon: "receipt_long",             label: "Challan Check" },
  { href: "/compare",          icon: "compare",                  label: "Compare Cars" },
  { href: "/help",             icon: "help_outline",             label: "Help & Support" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* Lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger trigger — visible on lg and below */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors press-effect"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
          menu
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={[
          "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={[
          "fixed top-0 left-0 h-full w-[300px] bg-white z-[61] flex flex-col",
          "shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-modal={open ? true : undefined}
        aria-hidden={!open}
        inert={!open}
        role={open ? "dialog" : undefined}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-outline-variant flex-shrink-0">
          <Image
              src="/drivio-logo.png"
              alt="DrivioCars — Cars for a brighter tomorrow"
              width={1061}
              height={240}
              className="h-9 w-auto"
            />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>close</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3">
          {allLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "flex items-center gap-3.5 px-5 py-3.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary-subtle text-primary"
                    : "text-on-surface hover:bg-surface-container-low hover:text-primary",
                ].join(" ")}
              >
                <span
                  className={[
                    "material-symbols-outlined",
                    active ? "text-primary" : "text-on-surface-variant",
                  ].join(" ")}
                  style={{
                    fontSize: "20px",
                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="flex-shrink-0 border-t border-outline-variant px-5 py-4 space-y-3">
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "18px" }}>
              account_circle
            </span>
            Sign In / Create Account
          </Link>
          <Link
            href="/sell"
            className="flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-3 rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-md shadow-primary/20 press-effect"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
            Sell My Car — It&apos;s Free
          </Link>
        </div>
      </div>
    </>
  );
}
