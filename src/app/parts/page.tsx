import Link from "next/link";
import { serverFetch } from "@/lib/api-server";
import { getCmsParts } from "@/lib/cms";
import PartCard, { categoryIcon, type PartSummary } from "@/components/parts/PartCard";

type Category = { id: number; name: string; slug: string; description: string; part_count: number };
type Brand = { id: number; name: string; slug: string };

const FALLBACK = {
  eyebrow: "Parts catalogue",
  title: "The right part, first time.",
  description:
    "Search by part name or SKU, then narrow by the car you drive. Genuine, refurbished and used parts from verified sellers.",
  promises: [
    { icon: "verified", title: "Fitment checked", text: "Every listing shows the brands and models it fits. Ask the seller before you buy." },
    { icon: "shield", title: "Condition, stated plainly", text: "New, refurbished or used, with genuine OEM parts clearly marked." },
    { icon: "assignment_return", title: "Return window", text: "Returns are handled through your saved order, with refunds tracked." },
  ],
  seller_cta: {
    title: "Sell parts on DrivioCars",
    text: "List your inventory, answer fitment questions and track every order from one dashboard.",
  },
};

async function list<T>(endpoint: string): Promise<{ items: T[]; count: number }> {
  try {
    const res = await serverFetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { items: [], count: 0 };
    const data = await res.json();
    const items: T[] = Array.isArray(data) ? data : data.results || [];
    return { items, count: data.count ?? items.length };
  } catch {
    return { items: [], count: 0 };
  }
}

export default async function PartsPage() {
  const [cms, featured, all, cats, brands] = await Promise.all([
    getCmsParts(),
    list<PartSummary>("/parts/?is_featured=true"),
    list<PartSummary>("/parts/?sort=newest"),
    list<Category>("/parts/categories/"),
    list<Brand>("/cars/brands/"),
  ]);
  const copy = cms ?? FALLBACK;
  const picks = (featured.items.length ? featured.items : all.items).slice(0, 8);
  const unavailable = !all.count && !cats.items.length;

  return (
    <>
      <section className="pt-hero">
        <div className="pt-wrap pt-hero-grid">
          <div>
            <p className="pt-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="pt-lede">{copy.description}</p>
            <form action="/parts/list" className="pt-search" role="search">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input
                name="q"
                aria-label="Search parts by name or SKU"
                placeholder="Part name or SKU, e.g. brake disc, BRK-FD-3001"
              />
              <button type="submit">Find parts</button>
            </form>
            <p className="pt-quick">
              Popular:
              {["Brake pads", "Clutch kit", "Headlamp", "Engine oil"].map((q) => (
                <Link key={q} href={`/parts/list?q=${encodeURIComponent(q)}`}>{q}</Link>
              ))}
            </p>
          </div>
          <dl className="pt-stats" aria-label="Catalogue at a glance">
            <div><dt>Parts listed</dt><dd>{all.count}</dd></div>
            <div><dt>Categories</dt><dd>{cats.items.length}</dd></div>
            <div><dt>Car brands covered</dt><dd>{brands.items.length}</dd></div>
          </dl>
        </div>
      </section>

      {unavailable && (
        <div className="pt-wrap">
          <p className="pt-empty">The catalogue is temporarily unavailable. Please try again shortly.</p>
        </div>
      )}

      {cats.items.length > 0 && (
        <section className="pt-wrap pt-section" id="categories">
          <header className="pt-head">
            <h2>Shop by system</h2>
            <Link href="/parts/list">Browse everything →</Link>
          </header>
          <ol className="pt-cats">
            {cats.items.filter((c) => c.part_count > 0).map((c, i) => (
              <li key={c.id} style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/parts/list?category=${c.slug}`}>
                  <span className="pt-cat-no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="material-symbols-outlined" aria-hidden="true">{categoryIcon(c.name)}</span>
                  <span className="pt-cat-text">
                    <strong>{c.name}</strong>
                    <small>{c.description}</small>
                  </span>
                  <span className="pt-cat-count">{c.part_count} {c.part_count === 1 ? "part" : "parts"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {picks.length > 0 && (
        <section className="pt-wrap pt-section">
          <header className="pt-head">
            <h2>{featured.items.length ? "Workshop picks" : "Latest arrivals"}</h2>
            <Link href="/parts/list">View all {all.count} →</Link>
          </header>
          <div className="pt-grid">
            {picks.map((p, i) => <PartCard key={p.id} part={p} index={i} />)}
          </div>
        </section>
      )}

      {brands.items.length > 0 && (
        <section className="pt-wrap pt-section">
          <header className="pt-head"><h2>Shop by vehicle</h2></header>
          <div className="pt-brands">
            {brands.items.map((b) => (
              <Link key={b.id} href={`/parts/list?make=${b.slug}`}>
                <span>{b.name}</span>
                <small>Parts that fit →</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="pt-wrap pt-section">
        <ul className="pt-promises">
          {copy.promises.map((p, i) => (
            <li key={p.title}>
              <span className="pt-promise-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="material-symbols-outlined" aria-hidden="true">{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pt-wrap pt-section">
        <div className="pt-cta">
          <div>
            <h2>{copy.seller_cta.title}</h2>
            <p>{copy.seller_cta.text}</p>
          </div>
          <Link href="/vendor/register">Become a seller →</Link>
        </div>
      </section>
    </>
  );
}
