import Link from "next/link";
import Image from "next/image";

const cols = [
  {
    title: "Marketplace",
    links: [
      { href: "/cars",            label: "Browse Inventory" },
      { href: "/auctions",        label: "Live Auctions" },
      { href: "/parts",           label: "Parts & Accessories" },
      { href: "/vendor/register", label: "Become a Vendor" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/inspection/1",    label: "Expert Inspection" },
      { href: "/valuation",       label: "Value My Car" },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { href: "/history/VIN-DEMO", label: "RC & History Check" },
      { href: "/challan",          label: "Challan Check" },
      { href: "/help",             label: "Help Centre" },
      { href: "/help",             label: "Contact Us" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/help", label: "About DrivioCars" },
      { href: "/policies/privacy", label: "Privacy Policy" },
      { href: "/policies/terms", label: "Terms of Service" },
      { href: "/contact", label: "Contact us" },
    ],
  },
];

const trustStats = [
  { value: "Browse", label: "Vehicle listings" },
  { value: "Ask", label: "Seller enquiries" },
  { value: "Track", label: "Saved orders" },
  { value: "Review", label: "Listing records" },
];

export default function Footer() {
  return (
    <footer>
      {/* Stats banner */}
      <div className="bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {trustStats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-black text-white mb-1 headline tracking-tight">
                  {s.value}
                </div>
                <div className="text-sm font-medium text-dark-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-surface-container-low border-t border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">

            {/* Brand column */}
            <div className="md:col-span-1">
              <Link href="/" aria-label="DrivioCars home" className="inline-block mb-4">
                <Image
                  src="/drivio-logo.png"
                  alt="DrivioCars — Cars for a brighter tomorrow"
                  width={1061}
                  height={240}
                  className="h-12 w-auto"
                />
              </Link>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                A marketplace for vehicle listings, parts and auctions. Review each seller and listing before purchase.
              </p>
              <div className="flex items-center gap-2 bg-assured-container text-on-assured-container px-3 py-2 rounded-lg inline-flex w-fit">
                <span
                  className="material-symbols-outlined text-assured"
                  style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                <span className="label-caps text-xs">Review listing records</span>
              </div>
            </div>

            {/* Link columns */}
            {cols.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-widest mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-on-surface-variant">
              © 2026 DrivioCars. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span
                className="material-symbols-outlined text-assured"
                style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              End-to-End Encrypted · SSL Secured
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
