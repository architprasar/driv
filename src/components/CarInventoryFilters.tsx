"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const SORT_TO_ORDERING: Record<string, string> = {
  newest: "-created_at",
  price_asc: "price",
  price_desc: "-price",
  year_desc: "-year",
  year_asc: "year",
  mileage_asc: "mileage",
  mileage_desc: "-mileage",
};

export default function CarInventoryFilters({ totalCount, title }: { totalCount: number; title: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const currentSort = useMemo(() => {
    const explicitSort = searchParams.get("sort");
    if (explicitSort) return explicitSort;
    const ordering = searchParams.get("ordering") || "";
    const match = Object.entries(SORT_TO_ORDERING).find(([, value]) => value === ordering);
    return match?.[0] || "newest";
  }, [searchParams]);
  const currentFilters = useMemo(
    () => ({
      city: searchParams.get("city") || "",
      fuel_type: searchParams.get("fuel_type") || "",
      transmission: searchParams.get("transmission") || "",
      body_type: searchParams.get("body_type") || "",
      min_price: searchParams.get("min_price") || "",
      max_price: searchParams.get("max_price") || "",
      year_min: searchParams.get("year_min") || "",
      year_max: searchParams.get("year_max") || "",
    }),
    [searchParams]
  );
  const [draft, setDraft] = useState(currentFilters);

  const syncDraftFromUrl = () => setDraft(currentFilters);

  const setSort = (sortValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sortValue);
    const ordering = SORT_TO_ORDERING[sortValue] || SORT_TO_ORDERING.newest;
    params.set("ordering", ordering);
    params.delete("page");
    router.push(`/cars?${params.toString()}`);
  };

  const clearFilters = (closeAfter = false) => {
    const params = new URLSearchParams(searchParams.toString());
    ["city", "fuel_type", "transmission", "body_type", "min_price", "max_price", "year_min", "year_max"].forEach((key) => params.delete(key));
    router.push(`/cars?${params.toString()}`);
    setDraft({
      city: "",
      fuel_type: "",
      transmission: "",
      body_type: "",
      min_price: "",
      max_price: "",
      year_min: "",
      year_max: "",
    });
    if (closeAfter) setIsOpen(false);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(draft).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    router.push(`/cars?${params.toString()}`);
    setIsOpen(false);
  };

  const activeCount = Object.values(currentFilters).filter(Boolean).length;

  return (
    <section className="mb-0 py-2 w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base md:text-lg font-extrabold text-on-surface headline truncate">{title}</h1>
            <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">
              {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar ml-auto">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-outline-variant shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">swap_vert</span>
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Sort</span>
              <select
                className="bg-surface-container-low text-sm font-bold text-on-surface rounded-lg px-2.5 py-1.5 border border-outline-variant/40 focus:ring-0 cursor-pointer outline-none"
                value={currentSort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="year_desc">Year: Newest First</option>
                <option value="year_asc">Year: Oldest First</option>
                <option value="mileage_asc">Mileage: Lowest First</option>
                <option value="mileage_desc">Mileage: Highest First</option>
              </select>
            </div>
            <button
              onClick={() => {
                syncDraftFromUrl();
                setIsOpen(true);
              }}
              className="whitespace-nowrap px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl font-black text-sm tracking-wide flex items-center gap-2 border border-slate-800 shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/25 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-white text-slate-900 text-[11px] font-black">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => clearFilters(false)}
              className="whitespace-nowrap px-4 py-2.5 bg-white text-on-surface rounded-xl font-bold text-sm border border-outline-variant hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/45" aria-label="Close filters" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full md:max-w-3xl bg-white md:rounded-2xl rounded-t-3xl border border-outline-variant shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-950 to-slate-800 text-white border-b border-slate-700 px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300 font-bold">Search Control</p>
                  <h3 className="text-xl font-black headline">Refine Cars</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" value={draft.city} onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}>
                  <option value="">City</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Pune">Pune</option>
                </select>
                <select className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" value={draft.fuel_type} onChange={(e) => setDraft((prev) => ({ ...prev, fuel_type: e.target.value }))}>
                  <option value="">Fuel</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <select className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" value={draft.transmission} onChange={(e) => setDraft((prev) => ({ ...prev, transmission: e.target.value }))}>
                  <option value="">Transmission</option>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
                <select className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" value={draft.body_type} onChange={(e) => setDraft((prev) => ({ ...prev, body_type: e.target.value }))}>
                  <option value="">Body Type</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="coupe">Coupe</option>
                  <option value="convertible">Convertible</option>
                </select>
                <input className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" placeholder="Min ₹" value={draft.min_price} onChange={(e) => setDraft((prev) => ({ ...prev, min_price: e.target.value }))} />
                <input className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" placeholder="Max ₹" value={draft.max_price} onChange={(e) => setDraft((prev) => ({ ...prev, max_price: e.target.value }))} />
                <input className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" placeholder="Year from" value={draft.year_min} onChange={(e) => setDraft((prev) => ({ ...prev, year_min: e.target.value }))} />
                <input className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" placeholder="Year to" value={draft.year_max} onChange={(e) => setDraft((prev) => ({ ...prev, year_max: e.target.value }))} />
              </div>

              <div className="sticky bottom-0 bg-white border-t border-outline-variant p-4 flex gap-2">
                <button onClick={() => clearFilters(true)} className="flex-1 px-4 py-3 rounded-xl border border-outline-variant font-bold text-sm hover:bg-slate-50">
                  Clear
                </button>
                <button onClick={applyFilters} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-on-primary font-black text-sm tracking-wide shadow-md shadow-primary/30">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
