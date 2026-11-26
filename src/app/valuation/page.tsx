import Image from "next/image";

export default function ValuationPage() {
  return (
    <div className="px-6 max-w-4xl mx-auto">
      {/* Status */}
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full">
          ✓ Valuation Complete
        </span>
      </div>

      {/* Value Hero */}
      <section className="text-center mb-12">
        <h1 className="text-3xl font-extrabold tracking-tighter headline mb-4">
          Your car is worth
        </h1>
        <p className="text-5xl md:text-6xl font-black text-primary headline tracking-tighter">
          ₹32,500 – ₹35,200
        </p>
        <p className="text-on-surface-variant mt-4 max-w-md mx-auto">
          Based on 1,420 similar transactions in your area. This estimate is
          valid for the next 7 days.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            Get Instant Offer
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </button>
          <button className="bg-surface-container text-on-surface px-8 py-4 rounded-xl font-bold active:scale-95 transition-transform">
            List in Auction
          </button>
        </div>
      </section>

      {/* Your Car */}
      <div className="relative h-56 md:h-72 rounded-lg overflow-hidden mb-12">
        <Image
          alt="2021 BMW M3 Competition"
          className="object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEPshAJPCuMEJcYkAKR6mpWVhHULh4rz6VNAamM_T0lH9UqkE5dEfDNSi59PfbwQlE7ZrMi5Vq_oxr2ffnrMGPo9Nxd84IEhU67lz4tCL1LgWt2j0h2ELe14Omt5iF_fwFWlI7VX_LT5OFa8k4PcZNmBuqBJmVxwsBtGQTLzRfwsJAn8w0dtYuvjgA9OQ2wuGaFOsGfzD5bqRHdN98r20F9dcL3L8_9eXdm-FfHAlLPD1TJh4hLzq-MUoBlYLfJxB2g3Ot3a0D0c"
          fill
          sizes="(max-width: 768px) 100vw, 800px"
        />
        <div className="absolute inset-0 bg-linear-to-t from-on-surface/60 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
            Your Car
          </p>
          <p className="text-white text-lg font-bold headline">
            2021 BMW M3 Competition
          </p>
        </div>
      </div>

      {/* Valuation Breakdown */}
      <section className="mb-12">
        <h2 className="text-3xl font-extrabold tracking-tighter headline italic mb-2">
          Valuation Breakdown
        </h2>
        <p className="text-on-surface-variant mb-8">
          The data driving your car&apos;s market value.
        </p>

        <div className="space-y-6">
          {/* Market Demand */}
          <div className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">
                insights
              </span>
            </div>
            <h3 className="text-xl font-bold headline mb-2">Market Demand</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              High demand for Euro sedans in your region. Similar models are
              selling 15% faster than average.
            </p>
            <div className="flex items-center gap-2 text-sm text-primary font-bold">
              <span className="material-symbols-outlined text-sm">
                trending_up
              </span>
              + ₹2,400 Premium
            </div>
          </div>

          {/* Car Condition */}
          <div className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">
                auto_awesome
              </span>
            </div>
            <h3 className="text-xl font-bold headline mb-2">Car Condition</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Based on your report: &quot;Excellent&quot;. Paint depth and
              interior quality are in the top 5th percentile.
            </p>
            <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
              <span className="material-symbols-outlined text-sm">
                verified
              </span>
              Optimal Grade
            </div>
          </div>

          {/* Mileage Impact */}
          <div className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">
                speed
              </span>
            </div>
            <h3 className="text-xl font-bold headline mb-2">Mileage Impact</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              24,000 miles is significantly below the typical 35,000 mile
              average for this model year.
            </p>
            <div className="flex items-center gap-2 text-sm text-primary font-bold">
              <span className="material-symbols-outlined text-sm">add</span>
              + ₹1,850 Adjustment
            </div>
          </div>
        </div>
      </section>

      {/* Why Trust DrivioCars */}
      <section className="bg-primary-container text-on-primary-container p-8 rounded-lg mb-12">
        <h2 className="text-2xl font-extrabold tracking-tighter headline mb-6">
          Why trust DrivioCars?
        </h2>
        <div className="space-y-6">
          {[
            {
              icon: "sync",
              title: "Direct Market Integration",
              desc: "We sync with dealer networks and private sale registries in real-time to provide the most accurate pricing available.",
            },
            {
              icon: "handshake",
              title: "No-Obligation Offers",
              desc: "Our valuations are free and carry no commitment. Use it to negotiate elsewhere or sell directly to our network.",
            },
            {
              icon: "shield",
              title: "Price Protection",
              desc: "If you list with us, we guarantee your valuation for 7 days, protecting you from sudden market dips.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary-fixed">
                {item.icon}
              </span>
              <div>
                <h3 className="font-bold headline mb-1">{item.title}</h3>
                <p className="text-sm text-primary-fixed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA: Book Inspection */}
      <section className="text-center mb-12">
        <h2 className="text-2xl font-extrabold tracking-tighter headline mb-2">
          Want a more precise figure?
        </h2>
        <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
          A physical inspection can increase your valuation by confirming
          premium features and maintenance history.
        </p>
        <button className="bg-surface-container-lowest text-primary px-8 py-4 rounded-xl font-bold border-2 border-primary hover:bg-primary hover:text-on-primary transition-all active:scale-95">
          Book Professional Inspection
        </button>
      </section>
    </div>
  );
}
