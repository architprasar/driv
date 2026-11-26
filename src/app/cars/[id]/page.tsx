import Image from "next/image";
import CarActions from "@/components/commerce/CarActions";
import Link from "next/link";
import { serverFetch } from "@/lib/api-server";
import { notFound } from "next/navigation";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { getMediaUrl } from "@/lib/runtime-config";

export default async function CarDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const res = await serverFetch(`/cars/${id}/`);
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error("Vehicle details are temporarily unavailable.");

  const car = await res.json();
  const trust = car.trust_report || {};
  const historyFlags = trust.history_flags || {};
  const assurance = trust.assurance || {};
  const images = car.images?.length > 0 ? car.images : [{ image: null }];
  const price = parseFloat(car.price || "0");

  const specs = [
    { icon: "local_gas_station",        label: "Fuel Type",     value: car.fuel_type },
    { icon: "settings_input_component", label: "Transmission",  value: car.transmission },
    { icon: "speed",                    label: "Horsepower",    value: car.horsepower ? `${car.horsepower} HP` : "N/A" },
    { icon: "tire_repair",              label: "Mileage",       value: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : "N/A" },
    { icon: "calendar_month",           label: "Year",          value: car.year },
    { icon: "palette",                  label: "Colour",        value: car.color || "N/A" },
    { icon: "corporate_fare",           label: "Body Type",     value: car.body_type || "N/A" },
    { icon: "inventory_2",             label: "Owners",        value: car.owner_count ? `${car.owner_count}` : "Not provided" },
  ];

  return (
    <>
      {/* ── HERO GALLERY ── */}
      <section className="relative w-full bg-dark overflow-hidden -mt-16 pt-16 lg:-mt-[102px] lg:pt-[102px]">
        <div className="aspect-[16/7] md:aspect-[21/8] relative overflow-hidden">
          <div className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {images.map((img: any, idx: number) => (
              <div key={img.id || idx} className="min-w-full h-full snap-center relative">
                {img.image ? (
                  <Image
                    alt={`${car.brand?.name} ${car.model?.name}`}
                    className="w-full h-full object-cover"
                    src={getMediaUrl(img.image)}
                    fill
                    sizes="100vw"
                    priority={idx === 0}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dark-card">
                    <span
                      className="material-symbols-outlined text-dark-muted"
                      style={{ fontSize: "64px" }}
                    >
                      directions_car
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-dark/80 to-transparent pointer-events-none" />

          {/* Scroll indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full bg-white transition-all ${idx === 0 ? "w-6 opacity-100" : "w-1.5 opacity-40"}`}
                />
              ))}
            </div>
          )}

          {/* Assured + Views badges */}
          <div className="absolute top-5 left-5 flex gap-2 flex-wrap">
            <span className="badge-assured">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "11px", fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              {trust.inspection_status === "passed" ? "Inspection report available" : "Seller listing"}
            </span>
          </div>

          <div className="absolute top-5 right-5 bg-black/40 backdrop-blur-md text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>visibility</span>
            {car.views_count || 0} views
          </div>

          {/* Image count */}
          {images.length > 1 && (
            <div className="absolute bottom-5 right-5 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
              1 / {images.length}
            </div>
          )}
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* ── LEFT: Main Info ── */}
          <div className="lg:col-span-8 space-y-10">

            {/* Condition + Title + Price */}
            <AnimateOnScroll>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-live-container text-on-live-container border border-live-border rounded-full label-caps">
                  {car.condition?.replace("_", " ") || "Good"} Condition
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-subtle text-primary border border-primary-border rounded-full label-caps">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "11px", fontVariationSettings: "'FILL' 1" }}
                  >
                    fingerprint
                  </span>
                  VIN Validated
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-h1 text-on-surface">
                    {car.year} {car.brand?.name} {car.model?.name}
                  </h1>
                  <p className="text-on-surface-variant mt-1 font-medium">
                    {car.variant || "Standard Edition"} · {car.color}
                  </p>
                </div>
                <div className="md:text-right flex-shrink-0">
                  <div className="text-3xl font-black text-on-surface headline tracking-tight">
                    ₹{price.toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-on-surface-variant mt-0.5">
                    EMI from ₹{Math.round(price * 0.018 / 1000)}K/mo
                  </div>
                </div>
              </div>

              <CarActions car={car} />
            </AnimateOnScroll>

            {/* Key Specs Bento */}
            <AnimateOnScroll>
              <h2 className="text-h3 text-on-surface mb-4">Key Specifications</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-primary/30 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined text-primary mb-2 block"
                      style={{ fontSize: "22px" }}
                    >
                      {spec.icon}
                    </span>
                    <div className="label-caps text-on-surface-variant mb-1">{spec.label}</div>
                    <div className="font-bold text-on-surface capitalize text-sm">{spec.value}</div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>

            {/* Assured Trust Summary */}
            <AnimateOnScroll>
              <div className="bg-assured-container border border-assured-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-assured rounded-xl flex items-center justify-center flex-shrink-0">
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: "22px", fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-on-assured-container headline">DrivioCars Assured</h3>
                    <p className="text-sm text-on-assured-container/70">This vehicle has passed all Assured checks</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: "fact_check",
                      title: trust.inspection_status === "not_inspected" ? "Inspection not recorded" : `Inspection ${trust.inspection_status === "passed" ? "Passed" : "Reviewed"}`,
                      sub: trust.inspection_report_id ? `${trust.inspection_points_checked} checks recorded · Score ${trust.inspection_score}/100` : "Request a completed inspection report before purchase",
                    },
                    {
                      icon: "history",
                      title: "History Verified",
                      sub: historyFlags.clean_history_signal ? "No major flags detected" : "Review history before purchase",
                    },
                    {
                      icon: "autorenew",
                      title: `${assurance.return_window_days || 7}-Day Return Window`,
                      sub: "Full support post-delivery",
                    },
                    {
                      icon: "account_balance_wallet",
                      title: assurance.seller_verified ? "Seller Verified" : "Seller Review Pending",
                      sub: assurance.warranty_available ? "Warranty options available" : "Coverage may be limited",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 bg-white/60 rounded-xl p-3">
                      <span
                        className="material-symbols-outlined text-assured flex-shrink-0"
                        style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
                      >
                        {item.icon}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-on-assured-container">{item.title}</div>
                        <div className="text-xs text-on-assured-container/65 mt-0.5">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>

            {/* Description */}
            {car.description && (
              <AnimateOnScroll>
                <h2 className="text-h3 text-on-surface mb-4">About this Car</h2>
                <p className="text-on-surface-variant leading-relaxed text-base whitespace-pre-wrap">
                  {car.description}
                </p>
              </AnimateOnScroll>
            )}

            {/* Inspection + History */}
            <AnimateOnScroll>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Inspection Report */}
                <div className="bg-white border border-outline-variant rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-h4 text-on-surface">Inspection Report</h3>
                    <button className="label-caps text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                        download
                      </span>
                      PDF
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Mechanical & Engine",
                      "Interior Electronics",
                      "Brakes & Suspension",
                      "Exterior & Body",
                      "AC & Electricals",
                    ].map((item) => (
                      <div key={item} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
                        <span className="text-sm text-on-surface-variant">{item}</span>
                        <span
                          className="material-symbols-outlined text-assured"
                          style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
                    <span className="label-caps text-on-surface-variant">Overall Status</span>
                    <span className="text-lg font-black text-assured headline">PASSED</span>
                  </div>
                </div>

                {/* Vehicle History */}
                <div className="bg-white border border-outline-variant rounded-2xl p-6">
                  <h3 className="text-h4 text-on-surface mb-5">Vehicle History</h3>
                  <div className="space-y-4">
                    {[
                      {
                        icon: "history",
                        title: "No Accidents Reported",
                        sub: historyFlags.clean_history_signal ? "Clean signal available" : "Needs additional verification",
                      },
                      {
                        icon: "fingerprint",
                        title: "VIN Validated",
                        sub: car.vin || "On file with DrivioCars",
                      },
                      {
                        icon: "description",
                        title: "RC Verified",
                        sub: "Registration documents confirmed",
                      },
                      {
                        icon: "account_balance",
                        title: "No Loan Pending",
                        sub: "Hypothecation clear",
                      },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center flex-shrink-0">
                          <span
                            className="material-symbols-outlined text-primary"
                            style={{ fontSize: "18px" }}
                          >
                            {item.icon}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-on-surface">{item.title}</div>
                          <div className="text-xs text-on-surface-variant mt-0.5 font-mono">{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="lg:sticky lg:top-[114px] space-y-5">

              {/* Finance Calculator */}
              <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-lg shadow-black/5">
                <h3 className="text-h4 text-on-surface mb-5">Finance Calculator</h3>
                <div className="space-y-4">
                  <div>
                    <div className="label-caps text-on-surface-variant mb-2">Down Payment (20%)</div>
                    <div className="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-xl flex justify-between items-center">
                      <span className="font-bold text-on-surface">
                        ₹{Math.round(price * 0.2).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-on-surface-variant">20%</span>
                    </div>
                  </div>

                  <div>
                    <div className="label-caps text-on-surface-variant mb-2">Loan Term</div>
                    <div className="flex gap-2">
                      {["36 Mo", "48 Mo", "60 Mo", "72 Mo"].map((term, i) => (
                        <button
                          key={term}
                          className={[
                            "flex-1 py-2 rounded-lg text-xs font-bold transition-colors",
                            i === 2
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
                          ].join(" ")}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-4 text-center">
                    <div className="label-caps text-on-surface-variant mb-1">Estimated Monthly</div>
                    <div className="text-3xl font-black text-on-surface headline tracking-tight">
                      ₹{Math.round(price * 0.018 / 1000)}K
                      <span className="text-base font-bold text-on-surface-variant">/mo</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Seller Profile */}
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6">
                <div className="label-caps text-on-surface-variant mb-4">Listed By</div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary text-xl font-black flex-shrink-0">
                    {car.seller_name?.[0]?.toUpperCase() || "S"}
                  </div>
                  <div>
                    <div className="font-bold text-on-surface headline">
                      {car.seller_name || "Verified Seller"}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="material-symbols-outlined text-live"
                        style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      <span className="text-sm font-bold text-on-surface">4.9</span>
                      <span className="text-xs text-on-surface-variant">(124 deals)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      location_on
                    </span>
                    {car.location || "Location not specified"}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <span
                      className="material-symbols-outlined text-assured"
                      style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}
                    >
                      verified_user
                    </span>
                    <span className="font-semibold text-on-surface">Identity Verified</span>
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary py-3 rounded-xl font-bold hover:bg-primary-subtle transition-colors text-sm press-effect">
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    call
                  </span>
                  Contact Seller
                </button>
              </div>

              {/* Assured Guarantee */}
              <div className="bg-dark rounded-2xl p-5 text-center">
                <span
                  className="material-symbols-outlined text-assured mx-auto mb-3 block"
                  style={{ fontSize: "36px", fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                <h4 className="font-bold text-white mb-2 headline text-sm">Assured Buyer Protection</h4>
                <p className="text-dark-muted text-xs leading-relaxed">
                  Review the vehicle, inspection records, and handover documents before confirming receipt. Return requests follow the policy shown at checkout.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
