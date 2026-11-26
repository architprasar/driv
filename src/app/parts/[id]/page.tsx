import { serverFetch } from "@/lib/api-server";
import { notFound } from "next/navigation";
import PartImageGallery from "@/components/PartImageGallery";
import AddToCartButton from "@/components/AddToCartButton";
import PartQuestion from "@/components/commerce/PartQuestion";
import PartReviews from "@/components/PartReviews";
import Link from "next/link";

export default async function PartDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const res = await serverFetch(`/parts/${params.id}/`);
  
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error("Failed to fetch part details");
  }

  const part = await res.json();

  return (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
        <Link href="/parts/list" className="hover:text-primary transition-colors">Parts</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href={`/parts/list?category=${part.category?.slug}`} className="hover:text-primary transition-colors">
          {part.category?.name || "Category"}
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-slate-800 line-clamp-1">{part.name}</span>
      </nav>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Left Column: Media */}
        <div className="w-full">
          <PartImageGallery images={part.images || []} name={part.name} />
          
          {/* Trust Highlights */}
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-100">
               <span className="material-symbols-outlined text-primary text-2xl">local_shipping</span>
               <div>
                 <p className="font-bold text-sm">Delivery options</p>
                 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Shown at checkout</p>
               </div>
             </div>
             <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-100">
               <span className="material-symbols-outlined text-primary text-2xl">verified</span>
               <div>
                 <p className="font-bold text-sm">Returns & support</p>
                 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Review terms at checkout</p>
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {part.is_genuine && (
                <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                  Genuine OEM
                </span>
              )}
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                SKU: {part.sku || "N/A"}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black headline text-slate-900 leading-tight mb-4 tracking-tighter">
              {part.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
              <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/50">
                <span className="material-symbols-outlined text-[16px] fill-amber-500">star</span>
                {parseFloat(part.rating || "0").toFixed(1)} <span className="text-amber-700/60 font-medium font-sans">({part.review_count || 0} reviews)</span>
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 border border-slate-200/50">
                <span className="material-symbols-outlined text-[16px] text-slate-400">inventory_2</span>
                {part.stock > 0 ? `${part.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 my-8" />

          {/* Pricing & Cart Action */}
          <div className="mb-8">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Price</p>
            <div className="text-5xl font-black headline text-primary mb-8 tracking-tighter">
              ₹{parseFloat(part.price).toLocaleString("en-IN")}
            </div>
            
            <AddToCartButton 
              part={{
                id: part.id,
                name: part.name,
                price: part.price,
                stock: part.stock,
                image: part.images?.[0]?.image,
                sku: part.sku
              }}
            />
          </div>

          <PartQuestion id={part.id} />
          {/* Details / Description */}
          <div className="flex-1">
            <h3 className="font-extrabold text-lg mb-4">Product Overview</h3>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600 font-medium leading-relaxed">
              {part.description ? (
                <p>{part.description}</p>
              ) : (
                <p className="italic text-slate-400">No detailed description available for this part. Please verify fitment via your vehicle manual or contact the seller directly.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Component */}
      <PartReviews partId={part.id} compatibleBrands={part.compatible_brands} compatibleModels={part.compatible_models} />
    </div>
  );
}
