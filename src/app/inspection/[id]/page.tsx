import Image from "next/image";

const checklistSections = [
  {
    title: "Interior & Cabin",
    points: "35 Points Verified",
    items: [
      { name: "Seat Rail Lubrication", status: "PASSED" },
      { name: "Sunroof Seal Integrity", status: "PASSED" },
      { name: "Door Card Fitment", status: "PASSED" },
      { name: "Upholstery Wear Audit", status: "FAIR (MINOR)" },
      { name: "Infotainment Response", status: "PASSED" },
      { name: "Cabin Filter Condition", status: "REPLACED" },
    ],
  },
];

export default function InspectionPage() {
  return (
    <div className="px-6 max-w-4xl mx-auto">
      {/* Status */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-400 text-on-surface px-3 py-1 rounded-full">
          Luxury Sedan
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full">
          ✓ Verified Pre-Purchase
        </span>
      </div>
      <p className="text-xs text-on-surface-variant font-mono mb-4">
        Inspected by DrivioCars RB8829.5 • As-I-See Profile
      </p>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter headline mb-2">
        Porsche Taycan Turbo S
      </h1>
      <p className="text-sm text-on-surface-variant mb-8">
        This vehicle has undergone a rigorous 150-point inspection by our master
        technicians. The structural integrity and electrical systems are in
        pristine condition.
      </p>

      {/* Grade & Inspector */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-slate-100/50">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">
            Grade
          </p>
          <p className="text-2xl font-black headline text-primary">
            EXCEPTIONAL
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-slate-100/50">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">
            Inspector
          </p>
          <p className="text-lg font-bold headline">Marcus V.</p>
        </div>
      </div>

      {/* Powertrain & Battery */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50 mb-6">
        <h2 className="text-xl font-bold headline flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">
            settings
          </span>
          Powertrain & Battery
        </h2>
        <p className="text-sm text-primary font-bold mb-4">42/42 PASSED</p>
        <div className="space-y-3">
          {[
            { name: "Battery Health", value: "98.4%" },
            { name: "Cooling System Integrity", status: "check" },
            { name: "Drive Unit Calibration", status: "check" },
            { name: "Torque Vectoring Sync", status: "check" },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-sm">
                  check_circle
                </span>
                <span>{item.name}</span>
              </div>
              {"value" in item ? (
                <span className="font-bold">{item.value}</span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Overall Summary */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50 mb-6">
        <h2 className="text-xl font-bold headline mb-4">Overall Summary</h2>
        <p className="text-3xl font-black headline text-primary mb-4">A+</p>
        <p className="text-sm text-on-surface-variant">
          Top-tier performance with zero reported mechanical issues. Minor
          aesthetic wear documented in the Interior section.
        </p>
      </section>

      {/* Body & Exterior */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50 mb-6">
        <h2 className="text-xl font-bold headline flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">
            directions_car
          </span>
          Body & Exterior
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Paint Depth</span>
            <span className="font-bold">Factory Std</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Panel Gaps</span>
            <span className="font-bold">Uniform</span>
          </div>
        </div>
        <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-600 text-sm">
              warning
            </span>
            <span className="font-bold text-sm">Minor Flag</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            2mm chip on front lip
          </p>
        </div>
      </section>

      {/* Electronics & Interior */}
      <section className="bg-surface-container-lowest p-8 rounded-lg border border-slate-100/50 mb-6">
        <h2 className="text-xl font-bold headline flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">
            tv
          </span>
          Electronics & Interior
        </h2>
        <div className="space-y-3 text-sm">
          {[
            { label: "Climate", value: "Dual-Zone OK" },
            { label: "Infotainment", value: "Ver 4.2 Updated" },
            { label: "Leather", value: "9/10 Quality" },
            { label: "ADAS", value: "Calibrated" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-sm">
                  check_circle
                </span>
                {item.label}
              </span>
              <span className="font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Full 150-Point Audit */}
      <section className="bg-on-surface text-surface p-8 rounded-lg mb-6">
        <h2 className="text-2xl font-extrabold tracking-tighter headline mb-4">
          The Full 150-Point Audit
        </h2>
        <p className="text-sm text-surface/70 mb-6">
          Every inch of the vehicle has been documented. Toggle categories below
          to view individual point statuses.
        </p>

        {checklistSections.map((section) => (
          <details key={section.title} className="group mb-4 bg-surface/10 rounded-lg p-4 [&_summary::-webkit-details-marker]:hidden open:bg-surface/20 transition-colors">
            <summary className="flex items-center justify-between font-bold outline-none cursor-pointer list-none">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  event_seat
                </span>
                <h3>{section.title}</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-surface/50 font-bold hidden sm:block">
                  {section.points}
                </span>
                <span className="material-symbols-outlined text-surface/50 transition-transform group-open:rotate-180">
                  expand_more
                </span>
              </div>
            </summary>
            
            <div className="mt-4 pt-4 border-t border-surface/10 space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-surface/90">{item.name}</span>
                  <span
                    className={`font-bold text-xs px-2 py-1 rounded bg-black/20 ${
                      item.status === "PASSED"
                        ? "text-green-400"
                        : item.status === "REPLACED"
                        ? "text-amber-400"
                        : "text-amber-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>

      {/* Documented Wear */}
      <section className="mb-12">
        <h2 className="text-xl font-bold headline mb-6">Documented Wear</h2>
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-slate-100/50">
            <div className="relative h-48 rounded-lg overflow-hidden mb-4 bg-surface-container-low">
              <Image
                alt="Front lip chip"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAhza4wpsg-jLb4ZPN36PlE1yUPHCLBnGCTK8ECdwjpO-WKiNEXkkuk8iGbbuj1VkCoOb51ROroWWeWuufv6qWw7eDHBUZSSVerTtpn37E_KCXrzubSYoUHEVk_dniH6OOdtFf8bBWPmPCCRuoSjni88wataDRwWIm-eXRhPqqJdvRqH5_kxXZo9t9kIKttZq2DG3oN5njCxO_mmdH25grD8siGy5W33qUVkNC4PCQwEqsHQujUwMHdJwY5-_bHzrdJuHqeEp1DwA"
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>
            <h3 className="font-bold mb-1">Exterior: Front Lip</h3>
            <p className="text-sm text-on-surface-variant mb-2">
              Minor stone chip (&lt;2mm) consistent with normal highway usage.
              No structural compromise.
            </p>
            <span className="text-xs font-bold text-green-600">Ref ID: EXT</span>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg border border-slate-100/50">
            <div className="relative h-48 rounded-lg overflow-hidden mb-4 bg-surface-container-low">
              <Image
                alt="Driver bolster"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU00hoRJdY2jVm1quhVB3o7pIhaHUmNPeFhuYXmfkrvhgj5dcx1fp-ThffHON-dHnhPlPHMN3b94j11XXHSe4j5YOQ5r1VPYkfophckcusbPJMz6MNRksODqk0Di5wt6-ac4TdcX_r6rTP46xaSnZT8v3bTNcjYsIMjBNhJE3VQB1y382tbM5AGcY7q0r5u7iJrbh5VPPkzn9CHvE_e2QMt3IgpCtxllgmBq3XApTCel_IiQ5IyUE6oIuirBi5g1OGnkFrtlXlbAo"
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>
            <h3 className="font-bold mb-1">Interior: Driver Bolster</h3>
            <p className="text-sm text-on-surface-variant mb-2">
              Micro-creasing on leather entry point. Typical for 15k mileage.
              Treated with conditioner.
            </p>
            <span className="text-xs font-bold text-green-600">
              Ref ID: INT
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
