import Link from "next/link";
import Image from "next/image";
import SearchBar from "./SearchBar";
import CitySelector from "./CitySelector";
import MobileMenu from "./MobileMenu";

/*
  Desktop layout (≥ lg):
    Row 1 — h-16 (64px): Logo | SearchBar(flex-1) | City | Cart | Profile | Sell
    Row 2 — h-9  (36px): Buy Car · Sell · Auctions · Parts · Finance · Insurance · Value · RC
    Total: ~102px  →  main uses pt-[102px]

  Mobile layout (< lg):
    Row 1 — h-16 (64px): Logo | [Search icon] | Cart | Hamburger
    Total: 64px  →  main uses pt-16
*/

const categoryLinks = [
  { href: "/cars",             label: "Buy Car" },
  { href: "/sell",             label: "Sell Car" },
  { href: "/auctions",         label: "Auctions" },
  { href: "/parts",            label: "Parts" },
  { href: "/valuation",        label: "Value My Car" },
  { href: "/history/VIN-DEMO", label: "RC Check" },
  { href: "/challan",          label: "Challan" },
];

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white navbar-shadow">

      {/* ══ ROW 1: Main Bar (always visible) ══ */}
      <div className="border-b border-outline-variant">
        <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 h-16 flex items-center gap-3">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
            aria-label="DrivioCars home"
          >
            <Image
              src="/drivio-logo.png"
              alt="DrivioCars — Cars for a brighter tomorrow"
              width={1061}
              height={240}
              priority
              className="h-9 sm:h-10 w-auto"
            />
          </Link>

          {/* ── Search (visible on md+, SearchBar itself controls exact breakpoint) ── */}
          <div className="flex-1 min-w-0">
            <SearchBar />
          </div>

          {/* ── City selector (lg+) ── */}
          <CitySelector />

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Mobile: search icon links to /search page */}
            <Link
              href="/search"
              aria-label="Search"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>search</span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>shopping_cart</span>
            </Link>

            {/* Profile (hidden on xs) */}
            <Link
              href="/profile"
              aria-label="Your profile"
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>account_circle</span>
            </Link>

            {/* Sell CTA (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2 ml-1">
              <div className="w-px h-5 bg-outline-variant" />
              <Link
                href="/sell"
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20 press-effect whitespace-nowrap"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
                Sell Car
              </Link>
            </div>

            {/* Mobile hamburger (rendered by client component) */}
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* ══ ROW 2: Category strip (desktop only, lg+) ══ */}
      <div className="hidden lg:block border-b border-outline-variant">
        <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 flex items-center h-9 gap-0.5">
          {categoryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-[11.5px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-subtle/70 whitespace-nowrap transition-all rounded-md"
            >
              {link.label}
            </Link>
          ))}

          {/* Right-aligned assured trust badge */}
          <div className="ml-auto flex items-center gap-1.5 text-assured">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            <span className="label-caps text-xs text-assured">All cars DrivioCars Assured</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
