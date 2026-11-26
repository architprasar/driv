import Image from "next/image";

export default function InspectionReportPage() {
  return (
    <div className="px-6 max-w-4xl mx-auto">
      {/* Status Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-on-primary px-3 py-1 rounded-full">
          Certified Pre-Owned
        </span>
        <span className="text-xs text-on-surface-variant font-mono">
          Report #DRV-8829-X
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter headline mb-1">
        Porsche Taycan Turbo S
      </h1>
      <p className="text-sm text-on-surface-variant mb-8">
        2023 • 12,450 miles • 1-Owner
      </p>

      {/* Inspection Score */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/30 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            DrivioCars Inspection Score
          </p>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-on-primary px-3 py-1 rounded-full">
            Exceptional
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-6xl font-black headline text-primary">
            9.4
          </span>
          <span className="text-2xl text-on-surface-variant font-bold">
            /10
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">
          Top 3% of inspected vehicles in this class.
        </p>
      </section>

      {/* Category Scores */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: "build", label: "Mechanical & Engine", score: "Excellent" },
          { icon: "directions_car", label: "Exterior & Body", score: "Pristine" },
          { icon: "chair", label: "Interior & Features", score: "Mint" },
        ].map((cat) => (
          <div
            key={cat.label}
            className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/30 text-center"
          >
            <span className="material-symbols-outlined text-primary text-2xl mb-2 block">
              {cat.icon}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              {cat.label}
            </p>
            <p className="text-sm font-bold text-primary">{cat.score}</p>
          </div>
        ))}
      </div>

      {/* Technical Vital Signs */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/30 mb-6">
        <h2 className="text-xl font-bold headline flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">
            monitor_heart
          </span>
          Technical Vital Signs
        </h2>

        {/* Battery Health */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Battery State of Health (SoH)</span>
            <span className="font-bold text-primary">98.4%</span>
          </div>
          <div className="w-full h-2.5 bg-surface-container-low rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: "98.4%" }}
            />
          </div>
        </div>

        {/* Other vitals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-4 rounded-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Brake Pad Life
            </p>
            <p className="text-2xl font-black headline">85%</p>
            <p className="text-xs text-on-surface-variant">(Remaining)</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Tire Tread Depth
            </p>
            <p className="text-2xl font-black headline">7/32&quot;</p>
            <p className="text-xs text-on-surface-variant">(Uniform)</p>
          </div>
        </div>
      </section>

      {/* Inspection Highlights */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold headline">
            Inspection Highlights
          </h2>
          <button className="text-primary font-bold text-sm">
            View all 42 photos
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative h-40 rounded-lg overflow-hidden">
            <Image
              alt="Tire condition"
              className="object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEPshAJPCuMEJcYkAKR6mpWVhHULh4rz6VNAamM_T0lH9UqkE5dEfDNSi59PfbwQlE7ZrMi5Vq_oxr2ffnrMGPo9Nxd84IEhU67lz4tCL1LgWt2j0h2ELe14Omt5iF_fwFWlI7VX_LT5OFa8k4PcZNmBuqBJmVxwsBtGQTLzRfwsJAn8w0dtYuvjgA9OQ2wuGaFOsGfzD5bqRHdN98r20F9dcL3L8_9eXdm-FfHAlLPD1TJh4hLzq-MUoBlYLfJxB2g3Ot3a0D0c"
              fill
              sizes="(max-width: 768px) 50vw, 400px"
            />
            <div className="absolute inset-0 bg-linear-to-t from-on-surface/60 to-transparent" />
            <p className="absolute bottom-2 left-2 text-white text-xs font-bold">
              Tire Condition Detail
            </p>
          </div>
          <div className="relative h-40 rounded-lg overflow-hidden">
            <Image
              alt="Front bumper"
              className="object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAhza4wpsg-jLb4ZPN36PlE1yUPHCLBnGCTK8ECdwjpO-WKiNEXkkuk8iGbbuj1VkCoOb51ROroWWeWuufv6qWw7eDHBUZSSVerTtpn37E_KCXrzubSYoUHEVk_dniH6OOdtFf8bBWPmPCCRuoSjni88wataDRwWIm-eXRhPqqJdvRqH5_kxXZo9t9kIKttZq2DG3oN5njCxO_mmdH25grD8siGy5W33qUVkNC4PCQwEqsHQujUwMHdJwY5-_bHzrdJuHqeEp1DwA"
              fill
              sizes="(max-width: 768px) 50vw, 400px"
            />
            <div className="absolute inset-0 bg-linear-to-t from-on-surface/60 to-transparent" />
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-bold uppercase bg-error text-on-error px-2 py-0.5 rounded-full">
                Minor Wear
              </span>
            </div>
            <p className="absolute bottom-2 left-2 text-white text-xs font-bold">
              Front Bumper Stone Chip
            </p>
          </div>
        </div>
      </section>

      {/* Detailed 150-Point Audit */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/30 mb-6">
        <h2 className="text-xl font-bold headline mb-6">
          Detailed 150-Point Audit
        </h2>
        <div className="space-y-4">
          {[
            {
              icon: "settings",
              title: "Powertrain & Electrical",
              score: "42/42 PASSED",
              scoreColor: "text-green-600",
              items: ["Drive Unit Calibration", "Cooling System Seal"],
            },
            {
              icon: "apartment",
              title: "Structural & Body",
              score: "35/35 PASSED",
              scoreColor: "text-green-600",
              items: [],
            },
            {
              icon: "chair",
              title: "Interior & Electronics",
              score: "Minor Flag",
              scoreColor: "text-amber-500",
              items: [],
            },
          ].map((section) => (
            <div
              key={section.title}
              className="border border-outline-variant/30 rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    {section.icon}
                  </span>
                  <span className="font-bold">{section.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${section.scoreColor}`}
                  >
                    {section.score}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    expand_more
                  </span>
                </div>
              </div>
              {section.items.length > 0 && (
                <div className="space-y-2 pl-9">
                  {section.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-on-surface-variant">{item}</span>
                      <span className="material-symbols-outlined text-green-600 text-sm">
                        check_circle
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Inspector Signature */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/30 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-2xl">
              person
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold headline">Marcus V.</h3>
              <span className="material-symbols-outlined text-primary text-sm">
                verified
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mb-1">
              Senior Automotive Auditor
            </p>
            <p className="text-xs text-primary font-bold mb-4">
              1,240+ Inspections Completed
            </p>
            <blockquote className="text-sm italic text-on-surface-variant border-l-2 border-primary pl-4">
              &quot;This Taycan is in remarkable condition. Aside from a
              negligible stone chip on the front lip, the vehicle presents
              as-new. The battery health is exceptional for its age.&quot;
            </blockquote>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Digital Signature
                </p>
                <p className="font-bold headline italic">Marcus Valerius</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Audit Date
                </p>
                <p className="font-bold">Oct 24, 2023</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Purchase & CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-primary text-on-primary px-6 py-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed">
              Purchase Price
            </p>
            <p className="text-2xl font-black headline">₹142,500</p>
            <p className="text-xs text-primary-fixed flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-300 rounded-full" />
              7-Day Return Policy
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white/20 text-white px-5 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              Inquire
            </button>
            <button className="bg-white text-primary px-5 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              Book Test Drive
            </button>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-28" />
    </div>
  );
}
