"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function PartsFilters({ totalCount, categories, title, basePath = "/parts/list" }: { totalCount: number; categories: any[]; title: string; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");

  const activeCount = useMemo(
    () => [searchParams.get("q"), searchParams.get("min_price"), searchParams.get("max_price"), searchParams.get("category"), searchParams.get("condition")].filter(Boolean).length,
    [searchParams]
  );

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (query) params.set("q", query); else params.delete("q");
    if (minPrice) params.set("min_price", minPrice); else params.delete("min_price");
    if (maxPrice) params.set("max_price", maxPrice); else params.delete("max_price");
    if (category) params.set("category", category); else params.delete("category");
    if (condition) params.set("condition", condition); else params.delete("condition");
    if (sort) params.set("sort", sort); else params.delete("sort");
    
    params.delete("page");
    
    router.push(`${basePath}?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["q", "min_price", "max_price", "category", "condition", "make", "model", "page"].forEach((k) => params.delete(k));
    router.push(`${basePath}?${params.toString()}`);
    setQuery("");
    setMinPrice("");
    setMaxPrice("");
    setCategory("");
    setCondition("");
  };

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
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                const params = new URLSearchParams(searchParams.toString());
                params.set("sort", e.target.value);
                params.delete("page");
                router.push(`${basePath}?${params.toString()}`);
              }}
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
          <button onClick={() => setIsOpen(true)} className="whitespace-nowrap px-4 py-2.5 bg-on-surface text-surface rounded-xl font-black text-sm tracking-wide flex items-center gap-2 press-effect">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Filters</span>
            {activeCount > 0 && <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-primary text-on-primary text-[11px] font-black">{activeCount}</span>}
          </button>
          <button onClick={clearFilters} className="whitespace-nowrap px-4 py-2.5 bg-white text-on-surface rounded-xl font-bold text-sm border border-outline-variant hover:bg-surface-container-low">
            Clear
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/45" aria-label="Close filters" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
            <div role="dialog" aria-modal="true" className="w-full md:max-w-3xl bg-white md:rounded-2xl rounded-t-3xl border border-outline-variant shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 z-10 bg-dark text-white border-b border-white/10 px-5 py-4 flex items-center justify-between">
                <h3 className="text-xl font-black headline">Refine Parts</h3>
                <button onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Keyword or Part #" className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" />
                {categories?.length > 0 && (
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none">
                    <option value="">All Categories</option>
                    {categories.map((c: any) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                )}
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₹" className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" />
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹" className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none" />
                <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                  {["new", "used", "refurbished"].map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition((prev) => (prev === cond ? "" : cond))}
                      className={`px-3 py-2 rounded-xl text-sm font-bold capitalize border ${condition === cond ? "bg-primary text-white border-primary" : "bg-white border-outline-variant text-on-surface"}`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-outline-variant p-4 flex gap-2">
                <button onClick={clearFilters} className="flex-1 px-4 py-3 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low">Clear</button>
                <button onClick={updateFilters} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-on-primary font-black text-sm tracking-wide">Apply Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
