"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BRANDS = ["Porsche", "BMW", "Mercedes-Benz", "Audi", "Ferrari", "Toyota", "Honda"];

export default function CompatibilityWidget() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [make, setMake] = useState(searchParams.get("make") || "");
  const [model, setModel] = useState(searchParams.get("model") || "");

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (make) params.set("make", make);
    else params.delete("make");
    
    if (model) params.set("model", model);
    else params.delete("model");
    
    params.delete("year");
    params.delete("page");
    
    router.push(`/parts/list?${params.toString()}`);
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xl">
      <h2 className="text-2xl font-extrabold headline flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">
          directions_car
        </span>
        Find seller-listed compatible parts
      </h2>
      <p className="text-sm text-slate-500 mb-4">Compatibility is supplied by sellers. Confirm the model year and OEM part number with the seller before buying.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container-low p-3 rounded-xl border border-transparent focus-within:border-primary/50 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1 px-1">
            Make
          </label>
          <select 
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="w-full bg-transparent border-none text-sm font-bold text-on-surface focus:ring-0 outline-none cursor-pointer"
          >
            <option value="">Any Make</option>
            {BRANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="bg-surface-container-low p-3 rounded-xl border border-transparent focus-within:border-primary/50 transition-colors">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1 px-1">
            Model
          </label>
          <input 
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. 911 GT3"
            className="w-full bg-transparent border-none text-sm font-bold text-on-surface placeholder:text-slate-400 focus:ring-0 outline-none"
          />
        </div>

        <button 
          onClick={handleSearch}
          className="bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-primary/20 h-[72px]"
        >
          <span className="material-symbols-outlined">search</span>
          Find Parts
        </button>
      </div>
    </div>
  );
}
