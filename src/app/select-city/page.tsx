"use client";

import { useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const CITY_COOKIE = "selected_city";

const POPULAR_CITIES = [
  { name: "Delhi NCR", subtitle: "Gurugram, Noida, Faridabad", icon: "🏙️" },
  { name: "Mumbai", subtitle: "Andheri, Navi Mumbai, Thane", icon: "🌊" },
  { name: "Bangalore", subtitle: "Whitefield, HSR, Indiranagar", icon: "🌿" },
  { name: "Hyderabad", subtitle: "Gachibowli, Jubilee Hills", icon: "🏛️" },
  { name: "Chennai", subtitle: "OMR, T Nagar, Anna Nagar", icon: "🌴" },
  { name: "Pune", subtitle: "Hinjawadi, Kothrud, Baner", icon: "🚗" },
  { name: "Kolkata", subtitle: "Salt Lake, Howrah, New Town", icon: "🌉" },
  { name: "Ahmedabad", subtitle: "SG Highway, Bopal, Maninagar", icon: "☀️" },
];

const QUICK_PICKS = ["All Cities", "Delhi NCR", "Mumbai", "Bangalore", "Pune"];

export default function SelectCityPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const selectedCity = Cookies.get(CITY_COOKIE) || "All Cities";

  const filteredCities = useMemo(() => {
    if (!query.trim()) return POPULAR_CITIES;
    return POPULAR_CITIES.filter((city) =>
      city.name.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [query]);

  const chooseCity = (city: string) => {
    Cookies.set(CITY_COOKIE, city, {
      sameSite: "Lax",
      secure: window.location.protocol === "https:",
      expires: 30,
    });
    window.dispatchEvent(new Event("drivio-city"));
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-102px)] bg-[radial-gradient(circle_at_top,#f4f7ff_0%,#ffffff_45%,#f8fbff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Choose Your City</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">Discover cars and parts near you</h1>
          <p className="mt-2 text-sm text-slate-600">Like BookMyShow, city-first browsing gives better inventory, faster delivery timelines, and relevant prices.</p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your city"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_PICKS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => chooseCity(city)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  selectedCity === city
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCities.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => chooseCity(city.name)}
                className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  selectedCity === city.name
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200"
                }`}
              >
                <div className="text-2xl">{city.icon}</div>
                <p className="mt-3 text-sm font-bold text-slate-900">{city.name}</p>
                <p className="mt-1 text-xs text-slate-600">{city.subtitle}</p>
              </button>
            ))}
          </div>

          {filteredCities.length === 0 && (
            <p className="mt-6 text-sm text-slate-600">No city found for &quot;{query}&quot;.</p>
          )}
        </div>
      </div>
    </div>
  );
}
