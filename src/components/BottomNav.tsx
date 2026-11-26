"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { icon: "home",           label: "Home",    href: "/" },
  { icon: "directions_car", label: "Buy",     href: "/cars" },
  { icon: "sell",           label: "Sell",    href: "/sell" },
  { icon: "shopping_cart",  label: "Cart",    href: "/cart" },
  { icon: "account_circle", label: "Profile", href: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 glass border-t border-outline-variant shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
      <div className="flex justify-around items-center px-2 py-1 pb-safe">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 min-w-0 flex-1 press-effect",
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface",
              ].join(" ")}
            >
              <div className={[
                "w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
                isActive ? "bg-primary-subtle" : "",
              ].join(" ")}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "22px",
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
