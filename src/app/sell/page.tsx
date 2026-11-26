import Image from "next/image";
import Link from "next/link";
import SellCaptureForm from "@/components/SellCaptureForm";


export default function SellPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-10">
      {/* Hero */}
      <section className="text-center mb-16">
        <span className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4 block">
          Digital Concierge Service
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter headline mb-4">
          Sell your car in 3{" "}
          <span className="italic text-primary">simple steps</span>. Fast, fair,
          and free.
        </h1>
        <p className="text-on-surface-variant text-sm mt-4">
          ★ Recent: Sold: Honda Civic for ₹18k • 2 days
        </p>
      </section>

      {/* Valuation Form */}
      <section className="max-w-2xl mx-auto mb-10 bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center">
        <Link href="/dashboard/cars/new" className="inline-flex bg-primary text-white rounded-xl px-6 py-3 mb-6 font-bold">Create a vehicle listing</Link><SellCaptureForm />
      </section>

      {/* Sell Parts Banner CTA */}
      <section className="max-w-4xl mx-auto mb-16">
        <div className="bg-dark rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black text-white headline mb-2 leading-tight">
              Looking to sell spare parts?
            </h2>
            <p className="text-dark-muted font-medium max-w-lg">
              Don't leave money sitting in your garage. List your individual OEM or aftermarket components on our global marketplace in minutes.
            </p>
          </div>
          <Link 
            href="/sell/part" 
            className="relative z-10 shrink-0 bg-primary text-white px-8 py-4 rounded-xl font-black hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">build</span>
            List a Part Now
          </Link>
        </div>
      </section>

      {/* Trusted Sellers Banner */}
      <div className="relative rounded-lg overflow-hidden min-h-[320px] mb-20">
        <Image
          alt="Premium car"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl2cAX5e0FotF-E4Cd8lLDaBTk4UQiS0p98iTsE3ZUwDx_qxhMtybpqTroTZQQjG0ZuGQZrh1HjnhXHV6vZ-kVGYHvNhcr_o0NU5sFcQcNUrjQT_RWzeZLjxTUWMHbkoIAx_OMNuV3b2lKWqmm7jOYnUN6nDYkZhNRPBFh21coLaqKECllVA4FTebIJ2gXi0h3-5now1aeqHrlk6oPSRakv4b7N65SzXnaw5OMHreJ42Zn8bKmDIT2JaiICUcCNPlbGX1DU1WMoWI"
          fill
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">
            ★ Trusted by 50k+ Sellers
          </p>
        </div>
      </div>

      {/* How It Works */}
      <section className="mb-20">
        <h2 className="text-3xl font-extrabold tracking-tighter headline mb-2">
          How it works
        </h2>
        <p className="text-on-surface-variant mb-12">
          Professionalism at every step of your car selling journey.
        </p>
        <div className="space-y-12">
          {[
            {
              step: "01",
              title: "Enter details",
              desc: "Provide your Brand, Model, and Year. Our coverage AI analyzes thousands of similar listings to find your car's true value.",
            },
            {
              step: "02",
              title: "Get Instant Valuation",
              desc: "Receive a transparent, fair offer based on current verified market trends. No lowballing, no hidden fees.",
            },
            {
              step: "03",
              title: "Schedule & Get Paid",
              desc: "Book a free inspection at your home. Once verified, the payment is initiated instantly. It's that simple.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-6">
              <span className="text-5xl font-black text-surface-container-high headline">
                {item.step}
              </span>
              <div>
                <h3 className="text-xl font-bold headline mb-2">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "trending_up",
              title: "Highest Price Guaranteed",
              desc: "We match or beat local dealership offers. Our vast network ensures you get top dollar for your machine.",
            },
            {
              icon: "payments",
              title: "Instant Payment",
              desc: "No waiting for weeks to get paid. We use direct bank transfers that hit your account before we even drive off.",
            },
            {
              icon: "home",
              title: "Free Home Inspection",
              desc: "We come to you. Our inspectors visit your preferred location at your convenience in 130+ cities.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 text-center card-hover"
            >
              <div className="w-16 h-16 bg-primary-fixed/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {item.icon}
                </span>
              </div>
              <h3 className="font-bold headline mb-2">{item.title}</h3>
              <p className="text-sm text-on-surface-variant">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-3xl font-extrabold tracking-tighter headline mb-2">
          Your questions, answered
        </h2>
        <p className="text-on-surface-variant mb-8">
          Everything you need to know about the DrivioCars process.
        </p>
        <div className="space-y-3">
          {[
            "How long does the valuation take?",
            "What documents do I need?",
            "Is there really no cost for the inspection?",
          ].map((q) => (
            <div
              key={q}
              className="flex items-center justify-between bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 cursor-pointer hover:bg-primary-subtle transition-colors"
            >
              <p className="font-bold">{q}</p>
              <span className="material-symbols-outlined text-on-surface-variant">
                expand_more
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
