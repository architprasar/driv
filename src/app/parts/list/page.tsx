import Link from "next/link";
import { serverFetch } from "@/lib/api-server";
import PartsFilters from "@/components/PartsFilters";
import PartCard, { type PartSummary } from "@/components/parts/PartCard";

export default async function PartsListingPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const pageNumber = Math.max(1, Number(searchParams.page) || 1);
  const queryParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) queryParams.append(key, String(value));
  });

  const [partsRes, categoriesRes] = await Promise.all([
    serverFetch(`/parts/?${queryParams.toString()}`),
    serverFetch("/parts/categories/"),
  ]);

  if (!partsRes.ok || !categoriesRes.ok) throw new Error("The parts catalogue is temporarily unavailable.");

  const partsData = (partsRes.headers.get("content-type") || "").includes("application/json")
    ? await partsRes.json()
    : {};
  const categoriesData = (categoriesRes.headers.get("content-type") || "").includes("application/json")
    ? await categoriesRes.json()
    : {};

  const partsList = partsData.results || (Array.isArray(partsData) ? partsData : []);
  const totalCount = partsData.count || partsList.length || 0;
  const categories = categoriesData.results || (Array.isArray(categoriesData) ? categoriesData : []);

  const active = ["q", "category", "condition", "make", "min_price", "max_price"]
    .map((k) => [k, searchParams[k]] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const raw = String(v);
      const label =
        k === "category"
          ? categories.find((c: { slug: string; name: string }) => c.slug === raw)?.name || raw
          : k === "q"
            ? `“${raw}”`
            : k === "min_price"
              ? `From ₹${Number(raw).toLocaleString("en-IN")}`
              : k === "max_price"
                ? `Up to ₹${Number(raw).toLocaleString("en-IN")}`
                : raw;
      const rest = new URLSearchParams(queryParams);
      rest.delete(k);
      rest.delete("page");
      return { key: k, label, href: `/parts/list${rest.toString() ? `?${rest}` : ""}` };
    });
  const pageHref = (n: number) => {
    const q = new URLSearchParams(queryParams);
    q.set("page", String(n));
    return `/parts/list?${q}`;
  };

  return (
    <div className="pt-wrap pt-list">
      <header className="pt-list-head">
        <nav aria-label="Breadcrumb" className="pt-crumbs">
          <Link href="/parts">Parts</Link> / <span>Catalogue</span>
        </nav>
        <h1>Parts catalogue</h1>
        <p>
          {totalCount} {totalCount === 1 ? "part" : "parts"}
          {active.length ? " match your filters" : " from verified sellers"}
        </p>
        {active.length > 0 && (
          <div className="pt-active" aria-label="Active filters">
            {active.map((f) => (
              <Link key={f.key} href={f.href} aria-label={`Remove filter ${f.label}`}>
                {f.label} <span aria-hidden="true">×</span>
              </Link>
            ))}
            <Link href="/parts/list" className="pt-active-clear">Clear all</Link>
          </div>
        )}
      </header>
      <div className="pt-filterbar">
        <PartsFilters totalCount={totalCount} categories={categories} title="Parts Directory" basePath="/parts/list" />
      </div>
      <main>
        {partsList.length === 0 ? (
          <div className="pt-empty-state">
            <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
            <h2>No parts match these filters</h2>
            <p>Try a broader search, a different condition, or clear the filters to see everything.</p>
            <Link href="/parts/list">Clear filters</Link>
          </div>
        ) : (
          <div className="pt-grid">
            {partsList.map((part: PartSummary, i: number) => (
              <PartCard key={part.id} part={part} index={i} />
            ))}
          </div>
        )}
        {totalCount > 20 && (
          <nav aria-label="Parts pages" className="pt-pager">
            {pageNumber > 1 ? <Link href={pageHref(pageNumber - 1)}>← Previous</Link> : <span />}
            <span>Page {pageNumber} of {Math.ceil(totalCount / 20)}</span>
            {partsData.next ? <Link href={pageHref(pageNumber + 1)}>Next →</Link> : <span />}
          </nav>
        )}
      </main>
    </div>
  );
}
