"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getApiBaseUrl, getMediaUrl } from "@/lib/runtime-config";

type SearchResults = { cars: any[]; parts: any[] };
type FeaturedSuggestion = { name: string; detail: string; href: string; image: string };

const FEATURED_CARS: FeaturedSuggestion[] = [
  { name: "BMW M4", detail: "Performance Coupe", href: "/search?q=BMW+M4", image: "/media/cars/bmw-m4.jpg" },
  { name: "Audi RS6", detail: "Luxury Wagon", href: "/search?q=Audi+RS6", image: "/media/cars/audi-rs6.jpg" },
  { name: "Corvette C8", detail: "Supercar Feel", href: "/search?q=Corvette+C8", image: "/media/cars/corvette-c8.jpg" },
  { name: "Range Rover", detail: "Premium SUV", href: "/search?q=Range+Rover", image: "/media/cars/range-rover.jpg" },
];

function normalizeSearchResults(payload: any): SearchResults {
  const container = payload?.results && typeof payload.results === "object" ? payload.results : payload;
  const cars = Array.isArray(container?.cars) ? container.cars : [];
  const parts = Array.isArray(container?.parts) ? container.parts : [];
  return { cars, parts };
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ cars: [], parts: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length >= 3) {
        setLoading(true);
        try {
          const API_URL = getApiBaseUrl();
          const res = await fetch(`${API_URL}/dashboard/search/?q=${encodeURIComponent(query.trim())}`);
          const data = await res.json();
          if (data && !data.error) setResults(normalizeSearchResults(data));
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
        setIsOpen(true);
      } else {
        setResults({ cars: [], parts: [] });
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(fetchResults, 400);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const totalResults = results.cars.length + results.parts.length;

  return (
    <div ref={wrapperRef} className="relative hidden md:block w-full max-w-lg xl:max-w-xl">
      {/* Backdrop overlay for focus */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close search suggestions"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-40 transition-opacity duration-300 cursor-default"
        />
      )}

      <form 
        onSubmit={handleSearch}
        className={`flex items-center bg-surface-container-low px-4 py-2 border transition-all duration-300 z-50 relative ${
          isOpen
            ? "w-full rounded-t-2xl border-transparent focus-within:bg-white shadow-none"
            : "w-[400px] rounded-full border-transparent focus-within:border-primary/30 focus-within:bg-white shadow-sm"
        }`}
      >
        <span className="material-symbols-outlined text-outline mr-2 transition-colors">
          search
        </span>
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant outline-none py-1"
          placeholder="Search cars, parts, auctions..."
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {loading && <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0 ml-2"></span>}
        
        {/* Clear query button */}
        {query && !loading && (
          <button 
            type="button" 
            onClick={() => { setQuery(""); setIsOpen(false); setResults({cars: [], parts: []}); }}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
          </button>
        )}
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white rounded-b-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border-t border-outline-variant/30 max-h-[75vh] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {query.trim().length < 3 ? (
            <div className="p-4">
              <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Trending Cars</p>
              <div className="grid grid-cols-1 gap-2">
                {FEATURED_CARS.map((car) => (
                  <Link
                    key={car.name}
                    href={car.href}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center gap-3 rounded-xl border border-outline-variant/30 p-2.5 hover:border-primary/30 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="relative h-12 w-16 overflow-hidden rounded-md">
                      <Image src={getMediaUrl(car.image)} alt={car.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary">{car.name}</p>
                      <p className="text-xs text-on-surface-variant">{car.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <p className="pt-3 text-xs text-on-surface-variant">Type at least 3 letters for smart autocomplete.</p>
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-outline">search_off</span>
              </div>
              <p className="text-on-surface font-medium mb-1">No results found</p>
              <p className="text-sm text-on-surface-variant">We couldn&apos;t find anything matching &quot;<span className="font-semibold text-on-surface">{query}</span>&quot;</p>
            </div>
          ) : (
            <div className="flex flex-col py-2">
              
              {/* Cars Section */}
              {results.cars.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-5 py-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Vehicles</span>
                    <span className="text-xs font-bold text-outline">{results.cars.length} found</span>
                  </div>
                  <div className="px-2">
                    {results.cars.slice(0, 4).map((car) => (
                      <Link
                        key={car.id}
                        href={`/cars/${car.id}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center justify-between p-3 hover:bg-surface-container-low rounded-xl transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 bg-surface-container-low rounded-lg relative overflow-hidden shrink-0 border border-outline-variant/30 shadow-sm group-hover:shadow-md transition-shadow">
                            {car.primary_image ? (
                              <Image src={car.primary_image.image || car.primary_image} alt="Thumbnail" fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="80px" />
                            ) : (
                              <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-outline text-sm">directions_car</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                              {car.brand_name} {car.model_name}
                            </h4>
                            <span className="text-xs font-medium text-on-surface-variant mt-0.5">{car.year}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-assured">₹{Number(car.price).toLocaleString("en-IN")}</span>
                          <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-300">chevron_right</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Parts Section */}
              {results.parts.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-5 py-2 mt-2 border-t border-outline-variant/20 pt-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Parts & Gear</span>
                    <span className="text-xs font-bold text-outline">{results.parts.length} found</span>
                  </div>
                  <div className="px-2">
                    {results.parts.slice(0, 4).map((part) => (
                      <Link
                        key={part.id}
                        href={`/parts/${part.id}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center justify-between p-3 hover:bg-surface-container-low rounded-xl transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-surface-container-low rounded-full relative overflow-hidden shrink-0 border border-outline-variant/30 shadow-sm group-hover:shadow-md transition-shadow">
                            {part.primary_image ? (
                              <Image src={part.primary_image} alt="Thumbnail" fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="80px" />
                            ) : (
                              <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-outline text-sm">build</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate max-w-[180px]">
                              {part.name}
                            </h4>
                            <span className="text-xs font-medium text-on-surface-variant mt-0.5">{part.category_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-on-surface">₹{Number(part.price).toLocaleString("en-IN")}</span>
                          <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-300">chevron_right</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View All Footer */}
              {totalResults > 0 && (
                <div className="px-4 py-3 mt-2 border-t border-outline-variant/20 bg-surface-container-low/50 rounded-b-2xl">
                  <button
                    onClick={handleSearch}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-xl shadow-md shadow-primary/20 active:scale-95 transition-all"
                  >
                    View all {totalResults} search results
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
