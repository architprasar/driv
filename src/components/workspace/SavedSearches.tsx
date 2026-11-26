"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  LoadState,
  Empty,
  Modal,
  Icon,
  Pager,
  Badge,
  date,
  errorMessage,
  type PageData,
} from "./WorkspaceUI";
type Search = {
  id: number;
  name: string;
  filters: Record<string, string>;
  new_matches_count: number;
  created_at: string;
};
type Brand = { id: number; name: string; slug: string };
type CarMatch = {
  id: number;
  year: number;
  brand_name: string;
  model_name: string;
  price: string;
};
export default function SavedSearches() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource<PageData<Search>>(
    `/saved-searches/?page=${page}`,
  );
  const brands = useResource<PageData<Brand>>("/cars/brands/?page_size=100");
  const [editing, setEditing] = useState<Partial<Search> | null>(null);
  const [deleting, setDeleting] = useState<Search | null>(null);
  const [matches, setMatches] = useState<Search | null>(null);
  const [matchPage, setMatchPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const filters = Object.fromEntries(
      ["brand", "min_price", "max_price", "city", "fuel_type", "transmission"]
        .map((key) => [key, String(form.get(key) || "").trim()])
        .filter(([, value]) => value),
    );
    setBusy(true);
    setFormError("");
    try {
      const payload = {
        name: form.get("name"),
        filters,
        notify_push: false,
        notify_email: false,
      };
      if (editing?.id)
        await apiClient.patch(`/saved-searches/${editing.id}/`, payload);
      else await apiClient.post("/saved-searches/", payload);
      setEditing(null);
      setMessage("Search preferences saved.");
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setFormError("");
    try {
      await apiClient.delete(`/saved-searches/${deleting.id}/`);
      setDeleting(null);
      setMessage("Saved search deleted.");
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Saved searches"
        description="Save the criteria that matter and return to matching vehicles."
        action={
          <button
            className="ws-button"
            onClick={() => {
              setEditing({ filters: {} });
              setFormError("");
            }}
          >
            <Icon name="add" />
            Save a search
          </button>
        }
      />
      {message && (
        <div className="ws-notice success" role="status">
          {message}
        </div>
      )}
      <section className="ws-panel">
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            icon="saved_search"
            title="Keep your next car in sight"
            text="Save a brand, budget, or city to quickly find vehicles that fit."
          />
        ) : (
          data.results.map((search) => (
            <article className="ws-feed-row" key={search.id}>
              <span className="ws-empty-icon">
                <Icon name="saved_search" />
              </span>
              <div>
                <h3>{search.name}</h3>
                <p>
                  {Object.entries(search.filters)
                    .filter(([key]) => !["source", "route"].includes(key))
                    .map(
                      ([key, value]) => `${key.replace(/_/g, " ")}: ${value}`,
                    )
                    .join(" · ") || "All vehicles"}
                </p>
                <small>
                  Saved {date(search.created_at)}{" "}
                  {search.new_matches_count > 0 && (
                    <Badge value={`${search.new_matches_count} new matches`} />
                  )}
                </small>
              </div>
              <div className="ws-row-actions">
                <button
                  onClick={async () => {
                    setMatches(search);
                    setMatchPage(1);
                    try {
                      await apiClient.patch(
                        `/saved-searches/${search.id}/ack/`,
                      );
                      reload();
                    } catch {
                      /* Matches remain available even if acknowledging fails. */
                    }
                  }}
                >
                  View matches
                </button>
                <button
                  onClick={() => {
                    setEditing(search);
                    setFormError("");
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setDeleting(search);
                    setFormError("");
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
        {!loading && !error && data && (
          <Pager count={data.count} page={page} setPage={setPage} size={20} />
        )}
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Edit search" : "Save a search"}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form className="ws-form" onSubmit={save}>
            {formError && (
              <div className="ws-notice error" role="alert">
                {formError}
              </div>
            )}
            <div className="ws-form-grid">
              <label className="ws-field full">
                Search name
                <input
                  name="name"
                  defaultValue={editing.name}
                  required
                  maxLength={100}
                  placeholder="My next family car"
                />
              </label>
              <label className="ws-field">
                Brand
                <select
                  name="brand"
                  defaultValue={editing.filters?.brand || ""}
                >
                  <option value="">Any brand</option>
                  {brands.data?.results?.map((brand) => (
                    <option key={brand.id} value={brand.slug}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ws-field">
                City
                <input
                  name="city"
                  defaultValue={editing.filters?.city}
                  placeholder="e.g. Mumbai"
                />
              </label>
              <label className="ws-field">
                Minimum price (INR)
                <input
                  name="min_price"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing.filters?.min_price}
                />
              </label>
              <label className="ws-field">
                Maximum price (INR)
                <input
                  name="max_price"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing.filters?.max_price}
                />
              </label>
              <label className="ws-field">
                Fuel type
                <select
                  name="fuel_type"
                  defaultValue={editing.filters?.fuel_type || ""}
                >
                  <option value="">Any fuel</option>
                  {["petrol", "diesel", "electric", "hybrid"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="ws-field">
                Transmission
                <select
                  name="transmission"
                  defaultValue={editing.filters?.transmission || ""}
                >
                  <option value="">Any transmission</option>
                  <option>automatic</option>
                  <option>manual</option>
                </select>
              </label>
            </div>
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="ws-button" disabled={busy}>
                {busy ? "Saving…" : "Save search"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete saved search?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <div className="ws-form">
            {formError && <div className="ws-notice error">{formError}</div>}
            <p>Remove “{deleting.name}” and its saved preferences?</p>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Keep search
              </button>
              <button
                className="ws-button danger"
                disabled={busy}
                onClick={remove}
              >
                {busy ? "Deleting…" : "Delete search"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {matches && (
        <Modal
          title={matches.name}
          onClose={() => {
            setMatches(null);
            reload();
          }}
        >
          <Matches id={matches.id} page={matchPage} setPage={setMatchPage} />
        </Modal>
      )}
    </>
  );
}
function Matches({
  id,
  page,
  setPage,
}: {
  id: number;
  page: number;
  setPage: (page: number) => void;
}) {
  const { data, error, loading, reload } = useResource<PageData<CarMatch>>(
    `/saved-searches/${id}/matches/?page=${page}`,
  );
  return (
    <>
      {loading || error ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : data?.results.length ? (
        <>
          {data.results.map((car) => (
            <div className="ws-feed-row" key={car.id}>
              <div>
                <h3>
                  {car.year} {car.brand_name} {car.model_name}
                </h3>
              </div>
              <Link className="ws-text-link ml-auto" href={`/cars/${car.id}`}>
                View vehicle
                <Icon name="arrow_forward" />
              </Link>
            </div>
          ))}
          <Pager count={data.count} page={page} setPage={setPage} />
        </>
      ) : (
        <Empty
          title="No matching vehicles yet"
          text="Broaden your criteria or return when more vehicles are listed."
          icon="search_off"
        />
      )}
    </>
  );
}
