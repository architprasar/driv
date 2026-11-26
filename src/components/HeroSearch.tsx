"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Cookies from "js-cookie";

const CITIES = [
  "All India",
  "Delhi NCR",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
];

export default function HeroSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All India");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (city !== "All India") {
      params.append("city", city);
      Cookies.set("selected_city", city, { sameSite: "Lax", secure: true, expires: 30 });
    }
    router.push(`/cars?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-2xl"
    >
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 flex flex-row overflow-hidden border border-outline-variant/30">

        {/* Search input */}
        <label className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 px-3 sm:px-5 py-3.5 sm:py-4 cursor-text">
          <span
            className="material-symbols-outlined text-outline shrink-0"
            style={{ fontSize: "20px" }}
          >
            search
          </span>
          <input
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-on-surface placeholder:text-outline font-medium text-sm sm:text-base"
            placeholder="Make, model…"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/* Divider — hidden on very small screens */}
        <div className="hidden sm:block w-px bg-outline-variant self-stretch" />

        {/* City select — hidden on small, shown sm+ */}
        <label className="hidden sm:flex items-center gap-2 px-4 sm:px-5 py-3.5 sm:py-4 sm:w-40 cursor-pointer shrink-0">
          <span
            className="material-symbols-outlined text-outline shrink-0"
            style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}
          >
            location_on
          </span>
          <select
            className="flex-1 bg-transparent border-none outline-none text-on-surface font-medium text-base appearance-none cursor-pointer"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="bg-primary hover:bg-primary-hover text-on-primary font-bold px-4 sm:px-7 py-3.5 sm:py-4 transition-colors duration-200 flex items-center justify-center gap-1.5 press-effect shrink-0"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>search</span>
          <span className="hidden sm:inline text-sm sm:text-base">Search</span>
        </button>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mt-3">
        {["Maruti", "Hyundai", "Tata", "Honda", "Toyota"].map((brand) => (
          <button
            key={brand}
            type="button"
            onClick={() => {
              setSearch(brand);
              router.push(`/cars?search=${encodeURIComponent(brand)}`);
            }}
            className="text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 transition-all duration-200"
          >
            {brand}
          </button>
        ))}
      </div>
    </form>
  );
}
