"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const SORT_TO_QUERY: Record<string, string> = {
  ending_soon: "Bid Ends Soon",
  newest: "Newest Listed",
  highest: "Highest Bid",
  lowest: "Lowest Bid",
};

export default function AuctionFilters({ title, totalCount }: { title: string; totalCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [damageType, setDamageType] = useState(searchParams.get("damage") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");

  const currentSort = useMemo(() => {
    const urlSort = searchParams.get("sort") || "";
    const hit = Object.entries(SORT_TO_QUERY).find(([, value]) => value === urlSort);
    return hit?.[0] || "ending_soon";
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (damageType) params.set("damage", damageType); else params.delete("damage");
    if (location.trim()) params.set("location", location.trim()); else params.delete("location");
    if (status) params.set("status", status); else params.delete("status");
    router.push(`/auctions?${params.toString()}`);
    setIsOpen(false);
  };

  const setSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", SORT_TO_QUERY[sort] || SORT_TO_QUERY.ending_soon);
    router.push(`/auctions?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["damage", "location", "status"].forEach((k) => params.delete(k));
    router.push(`/auctions?${params.toString()}`);
    setDamageType("");
    setLocation("");
    setStatus("");
  };

  const activeCount = [searchParams.get("damage"), searchParams.get("location"), searchParams.get("status")].filter(Boolean).length;

  return (
    <section className="mb-0 py-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-outline-variant rounded-xl px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base md:text-lg font-extrabold text-on-surface headline truncate">{title}</h1>
          <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">{totalCount}</span>
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
              <option value="ending_soon">Bid Ends Soon</option>
              <option value="newest">Newest Listed</option>
              <option value="highest">Highest Bid</option>
              <option value="lowest">Lowest Bid</option>
            </select>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="whitespace-nowrap px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl font-black text-sm tracking-wide flex items-center gap-2 border border-slate-800"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Filters</span>
            {activeCount > 0 && <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-white text-slate-900 text-[11px] font-black">{activeCount}</span>}
          </button>
          <button onClick={clearFilters} className="whitespace-nowrap px-4 py-2.5 bg-white text-on-surface rounded-xl font-bold text-sm border border-outline-variant hover:bg-slate-50">
            Clear
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/45" aria-label="Close filters" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
            <div role="dialog" aria-modal="true" className="w-full md:max-w-3xl bg-white md:rounded-2xl rounded-t-3xl border border-outline-variant shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-950 to-slate-800 text-white border-b border-slate-700 px-5 py-4 flex items-center justify-between">
                <h3 className="text-xl font-black headline">Refine Auctions</h3>
                <button onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" value={damageType} onChange={(e) => setDamageType(e.target.value)}>
                  <option value="">All Damage</option>
                  <option value="Front-end Impact">Front-end Impact</option>
                  <option value="Structural Damage">Structural Damage</option>
                  <option value="Water Damage">Water Damage</option>
                </select>
                <input className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" placeholder="Zip or City" value={location} onChange={(e) => setLocation(e.target.value)} />
                <select className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-outline-variant p-4 flex gap-2">
                <button onClick={clearFilters} className="flex-1 px-4 py-3 rounded-xl border border-outline-variant font-bold text-sm hover:bg-slate-50">Clear</button>
                <button onClick={applyFilters} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-on-primary font-black text-sm tracking-wide">Apply Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
