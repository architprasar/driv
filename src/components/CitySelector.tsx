"use client";
import { useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
const subscribe = (callback: () => void) => {
  window.addEventListener("drivio-city", callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener("drivio-city", callback);
    window.removeEventListener("focus", callback);
  };
};
const snapshot = () => Cookies.get("selected_city") || "All cities";
export default function CitySelector({
  className = "hidden xl:flex items-center gap-1.5 px-2 py-1 text-xs font-semibold",
}: {
  className?: string;
}) {
  const city = useSyncExternalStore(subscribe, snapshot, () => "All cities");
  return (
    <Link
      href="/select-city"
      aria-label={`Select city. Current: ${city}`}
      className={className}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        location_on
      </span>
      {city}
      <span className="material-symbols-outlined" aria-hidden="true">
        expand_more
      </span>
    </Link>
  );
}
