"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/profile" },
  { label: "Orders", href: "/profile/orders" },
  { label: "Settings", href: "/profile/settings" },
  { label: "Notifications", href: "/profile/notifications" },
  { label: "Saved Searches", href: "/profile/saved" },
];

export default function ProfileTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8 bg-surface-container-low rounded-2xl p-2 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/profile"
            ? pathname === "/profile"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "px-4 py-2.5 rounded-xl font-bold text-sm transition-colors",
              isActive
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-white/70",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
