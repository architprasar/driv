"use client";

import Link from "next/link";
import Cookies from "js-cookie";
import { errorMessage } from "@/components/workspace/WorkspaceUI";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Icon } from "@/components/home/HomePrimitives";
import HomeSelect from "@/components/home/HomeSelect";
import BuyVehicleCard, { VehicleImage } from "./BuyVehicleCard";
import BuyCardGrid from "./BuyCardGrid";
import { BuyFilters } from "./BuyFilters";
import {
  cityLabel,
  type Brand,
  type InventoryCar,
  type InventoryResponse,
} from "./inventory";

import {
  comparisonSnapshot,
  subscribeComparison,
  saveComparison,
} from "@/lib/comparison-store";

export default function BuyInventory({
  initial,
  query,
  brands,
  error,
}: {
  initial: InventoryResponse;
  query: string;
  brands: Brand[];
  error: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const params = new URLSearchParams(query);
  const [cars, setCars] = useState(initial.results);
  const [visibleCount, setVisibleCount] = useState(9);
  const [next, setNext] = useState(initial.next);
  const [page, setPage] = useState(Number(params.get("page") || 1));
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState(false);
  const comparison = useSyncExternalStore(
    subscribeComparison,
    comparisonSnapshot,
    () => "[]",
  );
  const compared = useMemo<InventoryCar[]>(() => {
    try {
      const values = JSON.parse(comparison);
      return Array.isArray(values)
        ? values
            .filter(
              (car): car is InventoryCar =>
                car &&
                typeof car.id === "number" &&
                typeof car.model_name === "string",
            )
            .slice(0, 4)
        : [];
    } catch {
      return [];
    }
  }, [comparison]);
  const [saved, setSaved] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertCreated, setAlertCreated] = useState(false);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const compareDialog = useRef<HTMLDialogElement>(null);
  const loadLock = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const city = cityLabel(params.get("city") || "");
  const filters = Array.from(params.entries()).filter(
    ([key]) => !["sort", "ordering", "page"].includes(key),
  );

  useEffect(() => {
    try {
      if (Cookies.get("session_present")) {
        void (async () => {
          const ids: number[] = [];
          for (let page = 1; page <= 100; page++) {
            const { data } = await apiClient.get<{
              results: InventoryCar[];
              next: string | null;
            }>(`/cars/saved/?page=${page}`);
            ids.push(...data.results.map((car) => car.id));
            if (!data.next) break;
          }
          setSaved(ids);
        })().catch(() => {});
      }
    } catch {
      /* Browsing still works when storage is unavailable. */
    }
    return () => abort.current?.abort();
  }, []);

  function navigate(nextParams: URLSearchParams) {
    nextParams.delete("page");
    if (!nextParams.has("city")) nextParams.set("city", "all");
    startTransition(() => router.push(`/cars?${nextParams}#buy-results`));
  }
  function toggleCompare(car: InventoryCar) {
    const exists = compared.some((item) => item.id === car.id);
    if (!exists && compared.length === 4) {
      setMessage("You can compare up to 4 cars. Remove one to add another.");
      return;
    }
    const updated = exists
      ? compared.filter((item) => item.id !== car.id)
      : [...compared, car];
    if (!saveComparison(updated)) {
      setMessage(
        "Comparison is available for this visit; device storage is unavailable.",
      );
    }
  }
  async function toggleSaved(car: InventoryCar) {
    if (saving) return;
    setSaving(true);
    const exists = saved.includes(car.id);
    try {
      if (exists) await apiClient.delete(`/cars/${car.id}/save/`);
      else await apiClient.post(`/cars/${car.id}/save/`);
      setSaved((previous) =>
        exists ? previous.filter((id) => id !== car.id) : [...previous, car.id],
      );
      setMessage(
        exists
          ? "Vehicle removed from your saved list."
          : "Vehicle saved to your account.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function loadMore() {
    if (loadLock.current) return;
    if (visibleCount < cars.length) {
      setVisibleCount((count) => count + 9);
      return;
    }
    if (!next) return;
    loadLock.current = true;
    setLoading(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const moreParams = new URLSearchParams(query);
      moreParams.set("page", String(page + 1));
      const { data } = await apiClient.get<InventoryResponse>(
        `/cars/?${moreParams}`,
        { signal: controller.signal },
      );
      setCars((previous) => [
        ...previous,
        ...data.results.filter(
          (car) => !previous.some((item) => item.id === car.id),
        ),
      ]);
      setNext(data.next);
      setPage((previous) => previous + 1);
      setVisibleCount((previous) => previous + 9);
    } catch {
      if (!controller.signal.aborted)
        setMessage("More cars couldn’t load. Please try again.");
    } finally {
      loadLock.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  async function saveSearch() {
    if (saving || alertCreated) return;
    setSaving(true);
    try {
      await apiClient.post("/saved-searches/", {
        name: `Cars in ${city}`,
        filters: Object.fromEntries(filters),
        notify_email: false,
        notify_push: false,
      });
      setAlertCreated(true);
      setMessage(
        "Search saved. View matching vehicles in Profile → Saved Searches.",
      );
    } catch (failure: unknown) {
      const status = (failure as { response?: { status?: number } }).response
        ?.status;
      setMessage(
        status === 401
          ? "Please sign in to save a search."
          : "The alert couldn’t be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  const filterLabel = (key: string, value: string) => {
    if (key === "city") return cityLabel(value);
    if (key === "max_price")
      return `Under ₹${(Number(value) / 100000).toLocaleString("en-IN")}L`;
    if (key === "min_price")
      return `From ₹${(Number(value) / 100000).toLocaleString("en-IN")}L`;
    if (key === "brand")
      return brands.find((brand) => brand.slug === value)?.name || value;
    if (key === "is_featured") return "Featured";
    return value.replaceAll("_", " ");
  };

  return (
    <>
      <div className="buy-container">
        <nav className="buy-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Buy Cars</span>
        </nav>
        <div className="buy-inventory-layout" id="buy-results">
          <aside className="buy-desktop-filters">
            <BuyFilters query={query} brands={brands} count={initial.count} />
          </aside>
          <div className="buy-results" aria-busy={pending || loading}>
            <div className="buy-results-toolbar">
              <div>
                <h2>
                  Available Cars{" "}
                  {city === "All India" ? "across India" : `in ${city}`}
                </h2>
                <span>{initial.count} cars found</span>
              </div>
              <div className="buy-toolbar-actions">
                <div className="buy-view-switch">
                  <button
                    aria-label="Grid view"
                    aria-pressed={!list}
                    onClick={() => setList(false)}
                  >
                    <Icon name="grid_view" />
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={list}
                    onClick={() => setList(true)}
                  >
                    <Icon name="format_list_bulleted" />
                  </button>
                </div>
                <HomeSelect
                  fitContent
                  aria-label="Sort cars"
                  value={params.get("sort") || "newest"}
                  onValueChange={(value) => {
                    const updated = new URLSearchParams(query);
                    updated.set("sort", value);
                    updated.delete("ordering");
                    navigate(updated);
                  }}
                >
                  <option value="newest">Sort by Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="mileage_asc">Lowest Kilometres</option>
                  <option value="year_desc">Newest Model Year</option>
                </HomeSelect>
                <button
                  className="buy-outline save-search"
                  onClick={saveSearch}
                  disabled={saving || alertCreated}
                >
                  <Icon name="notifications" />
                  {alertCreated
                    ? "Search Saved"
                    : saving
                      ? "Saving…"
                      : "Save This Search"}
                </button>
                <button
                  className="buy-outline buy-mobile-filter"
                  onClick={() => filterDialog.current?.showModal()}
                >
                  <Icon name="tune" />
                  Filter
                </button>
              </div>
            </div>
            <div className="buy-active-filters">
              {filters.map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => {
                    const updated = new URLSearchParams(query);
                    updated.delete(key);
                    navigate(updated);
                  }}
                  aria-label={`Remove ${filterLabel(key, value)} filter`}
                >
                  {filterLabel(key, value)}
                  <Icon name="close" />
                </button>
              ))}
              {filters.length > 0 && (
                <button
                  className="buy-clear"
                  onClick={() => navigate(new URLSearchParams())}
                >
                  Clear All
                </button>
              )}
            </div>
            {message && (
              <div className="buy-feedback" role="status">
                {message}
                {message.includes("sign in") && (
                  <Link href="/login">Sign In</Link>
                )}
                <button
                  aria-label="Dismiss message"
                  onClick={() => setMessage("")}
                >
                  <Icon name="close" />
                </button>
              </div>
            )}
            {error ? (
              <div className="buy-empty">
                <Icon name="cloud_off" />
                <h3>We couldn’t load the cars right now.</h3>
                <p>
                  Please try again in a moment. Your filters are still here.
                </p>
                <button
                  className="buy-button"
                  disabled={pending}
                  onClick={() => startTransition(() => router.refresh())}
                >
                  {pending ? "Retrying…" : "Try Again"}
                </button>
              </div>
            ) : cars.length === 0 ? (
              <div className="buy-empty">
                <Icon name="search_off" />
                <h3>No matching cars yet</h3>
                <p>Try a different budget, location or body type.</p>
                <button
                  className="buy-button"
                  onClick={() => navigate(new URLSearchParams())}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <BuyCardGrid
                list={list}
                revision={cars
                  .slice(0, visibleCount)
                  .map((car) => car.id)
                  .join(",")}
              >
                {cars.slice(0, visibleCount).map((car) => (
                  <BuyVehicleCard
                    key={car.id}
                    car={car}
                    compared={compared.some((item) => item.id === car.id)}
                    saved={saved.includes(car.id)}
                    toggleCompare={() => toggleCompare(car)}
                    toggleSaved={() => toggleSaved(car)}
                  />
                ))}
              </BuyCardGrid>
            )}
            <section className="buy-compare-tray">
              <Icon name="compare_arrows" />
              <div>
                <h3>Compare up to 4 cars</h3>
                <p>Select cars to compare features, prices and more.</p>
              </div>
              <div className="buy-compare-picks">
                {compared.map((car) => (
                  <div key={car.id}>
                    <div>
                      <VehicleImage car={car} />
                    </div>
                    <button
                      aria-label={`Remove ${car.model_name} from comparison`}
                      onClick={() => toggleCompare(car)}
                    >
                      <Icon name="close" />
                    </button>
                    <strong>{car.model_name}</strong>
                    <small>{car.year}</small>
                  </div>
                ))}
                {compared.length < 4 && (
                  <a href="#buy-results">
                    <Icon name="add" />
                    Add Car
                  </a>
                )}
              </div>
              <button
                className="buy-button"
                disabled={compared.length < 2}
                onClick={() => compareDialog.current?.showModal()}
              >
                Compare Cars
                <Icon name="arrow_forward" />
              </button>
            </section>
            {cars.length > 0 && (
              <div className="buy-progress">
                <span>
                  Showing {Math.min(visibleCount, cars.length)} of{" "}
                  {initial.count} cars
                </span>
                <progress
                  value={Math.min(visibleCount, cars.length)}
                  max={Math.max(1, initial.count)}
                  aria-label="Cars displayed"
                />
                {visibleCount < cars.length || next ? (
                  <button
                    className="buy-outline"
                    disabled={loading}
                    onClick={loadMore}
                  >
                    <Icon name="add" />
                    {loading ? "Loading Cars…" : "Load More Cars"}
                  </button>
                ) : (
                  <span>All matching cars loaded</span>
                )}
              </div>
            )}
          </div>
        </div>
        <section className="buy-alert">
          <Icon name="notifications_active" />
          <div>
            <h2>Can’t find the right car?</h2>
            <p>
              Create an alert and we’ll notify you when matching cars arrive.
            </p>
          </div>
          <div>
            <div className="buy-alert-chips">
              {filters.slice(0, 4).map(([key, value]) => (
                <span key={key}>{filterLabel(key, value)}</span>
              ))}
            </div>
            <button
              className="buy-button"
              onClick={saveSearch}
              disabled={saving || alertCreated}
            >
              {alertCreated
                ? "Alert Created"
                : saving
                  ? "Creating Alert…"
                  : "Create Car Alert"}
            </button>
            <small>
              Notifications use your signed-in account’s email and preferences.
            </small>
          </div>
        </section>
        {message && (
          <p role="status" className="buy-alert-message">
            {message}{" "}
            {message.includes("sign in") && <Link href="/login">Sign In</Link>}
          </p>
        )}
      </div>
      <dialog className="buy-filter-dialog" ref={filterDialog}>
        <div className="buy-dialog-heading">
          <h2>Filter Cars</h2>
          <button
            aria-label="Close filters"
            onClick={() => filterDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <BuyFilters
          key={query}
          query={query}
          brands={brands}
          count={initial.count}
          close={() => filterDialog.current?.close()}
        />
      </dialog>
      <dialog className="buy-comparison-dialog" ref={compareDialog}>
        <div className="buy-dialog-heading">
          <h2>Compare your cars</h2>
          <button
            aria-label="Close comparison"
            onClick={() => compareDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="buy-comparison-scroll">
          <table>
            <thead>
              <tr>
                <th>Specification</th>
                {compared.map((car) => (
                  <th key={car.id}>
                    {car.brand_name} {car.model_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Year", "year"],
                  ["Price (₹)", "price"],
                  ["Kilometres", "mileage"],
                  ["Fuel", "fuel_type"],
                  ["Transmission", "transmission"],
                  ["Condition", "condition"],
                ] as const
              ).map(([title, key]) => (
                <tr key={key}>
                  <th>{title}</th>
                  {compared.map((car) => (
                    <td key={car.id}>{car[key]}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Explore</th>
                {compared.map((car) => (
                  <td key={car.id}>
                    <Link href={`/cars/${car.id}`}>View Details →</Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </dialog>
    </>
  );
}
