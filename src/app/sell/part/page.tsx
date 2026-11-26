import { serverFetch } from "@/lib/api-server";
import PartListingForm from "@/components/PartListingForm";
import Link from "next/link";

export default async function SellPartPage() {
  // Fetch categories to populate the dropdown
  const res = await serverFetch("/parts/categories/");
  const categoriesData = await res.json();
  const categories = categoriesData.results || (Array.isArray(categoriesData) ? categoriesData : []);

  return (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      <Link href="/sell" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-10">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Selling Hub
      </Link>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-block bg-primary/10 text-primary border border-primary/20 font-black tracking-[0.2em] text-[10px] uppercase mb-4 px-3 py-1 rounded-full">
          Marketplace Listing
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 headline tracking-tighter mb-4">
          Turn your spare parts into cash.
        </h1>
        <p className="text-slate-500 font-medium text-lg">
          Reach millions of enthusiasts globally. Follow our simple 4-step wizard to get your part live on the grid.
        </p>
      </div>

      <PartListingForm categories={categories} />

      <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-16">
        Secure SSL Encrypted Session
      </p>
    </div>
  );
}
