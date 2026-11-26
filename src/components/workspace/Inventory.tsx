"use client";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/runtime-config";
import {
  PageHeader,
  ButtonLink,
  Icon,
  Badge,
  Empty,
  LoadState,
  Pager,
  Modal,
  useResource,
  type PageData,
  money,
  errorMessage,
} from "./WorkspaceUI";

type InventoryItem = {
  id: number;
  name?: string;
  year?: number;
  brand_name?: string;
  model_name?: string;
  sku?: string;
  vin?: string;
  primary_image?: string | { image: string } | null;
  price: string;
  stock?: number;
  status?: string;
  mileage?: number;
  views_count?: number;
  has_auction?: boolean;
};
export default function Inventory({
  type = "cars",
}: {
  type?: "cars" | "parts";
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("-created_at");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const url = `/dashboard/workspace/${type}/?${new URLSearchParams({ page: String(page), status, search: query, ordering })}`;
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useResource<PageData<InventoryItem>>(url);
  const title = (item: InventoryItem) =>
    type === "parts"
      ? item.name || "Part"
      : `${item.year} ${item.brand_name} ${item.model_name}`;
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload =
      type === "parts"
        ? { price: form.get("price"), stock: Number(form.get("stock")) }
        : { price: form.get("price"), status: form.get("status") };
    try {
      await apiClient.patch(`/${type}/${editing.id}/`, payload);
      setEditing(null);
      setMessage("Listing updated.");
      reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.delete(`/${type}/${deleting.id}/`);
      setDeleting(null);
      setMessage("Listing deleted.");
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        title={type === "parts" ? "Parts inventory" : "Vehicle inventory"}
        description={
          type === "parts"
            ? "Keep prices and stock up to date across your spare parts."
            : "Manage your vehicles from first draft to final sale."
        }
        action={
          <ButtonLink href={type === "parts" ? "/dashboard/parts/new" : "/dashboard/cars/new"}>
            <Icon name="add" />
            {type === "parts" ? "List a part" : "List a vehicle"}
          </ButtonLink>
        }
      />
      {message && (
        <div className="ws-notice success" role="status">
          <Icon name="check_circle" />
          {message}
        </div>
      )}
      <section className="ws-panel">
        <div className="ws-toolbar">
          <label className="ws-search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                type === "parts"
                  ? "Search by part name or SKU"
                  : "Search by brand, model or VIN"
              }
              aria-label="Search inventory"
            />
          </label>
          <select
            aria-label="Filter inventory"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              {type === "parts" ? "All stock levels" : "All statuses"}
            </option>
            {(type === "parts"
              ? ["in_stock", "low_stock", "out_of_stock"]
              : ["active", "draft", "sold", "archived"]
            ).map((value) => (
              <option value={value} key={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort inventory"
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
          >
            <option value="-created_at">Newest first</option>
            <option value="created_at">Oldest first</option>
            <option value="price">Price: low to high</option>
            <option value="-price">Price: high to low</option>
          </select>
          <span className="ws-toolbar-count">{data?.count || 0} listings</span>
        </div>
        {loading || loadError ? (
          <LoadState loading={loading} error={loadError} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            icon="garage"
            title={
              query || status
                ? "No listings match"
                : "Your inventory starts here"
            }
            text={
              query || status
                ? "Try a different search or clear the filter."
                : "Add your first listing to make it available to buyers."
            }
            href={
              query || status
                ? undefined
                : type === "parts"
                  ? "/dashboard/parts/new"
                  : "/dashboard/cars/new"
            }
            action="Create a listing"
          />
        ) : (
          <div className="ws-table-scroll">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>{type === "parts" ? "Part" : "Vehicle"}</th>
                  <th>Price</th>
                  <th>{type === "parts" ? "Stock" : "Mileage"}</th>
                  <th>Status</th>
                  {type === "cars" && <th>Views</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((item) => {
                  const image =
                    typeof item.primary_image === "string"
                      ? item.primary_image
                      : item.primary_image?.image;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="ws-item">
                          <span className="ws-item-image">
                            {image ? (
                              <Image
                                src={getMediaUrl(image)}
                                alt=""
                                fill
                                sizes="72px"
                              />
                            ) : (
                              <Icon
                                name={
                                  type === "cars"
                                    ? "directions_car"
                                    : "manufacturing"
                                }
                              />
                            )}
                          </span>
                          <div>
                            <strong>{title(item)}</strong>
                            <small>
                              {type === "parts" ? `SKU ${item.sku}` : item.vin}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="ws-number">{money(item.price)}</td>
                      <td>
                        {type === "parts"
                          ? `${item.stock} units`
                          : `${item.mileage?.toLocaleString("en-IN")} km`}
                      </td>
                      <td>
                        <Badge
                          value={
                            type === "parts"
                              ? !item.stock
                                ? "out_of_stock"
                                : item.stock <= 3
                                  ? "low_stock"
                                  : "in_stock"
                              : item.status || "draft"
                          }
                        />
                      </td>
                      {type === "cars" && <td>{item.views_count}</td>}
                      <td>
                        <div className="ws-row-actions">
                          <Link href={`/${type}/${item.id}`}>View</Link>
                          <button
                            onClick={() => {
                              setEditing(item);
                              setError("");
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleting(item);
                              setError("");
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !loadError && data && (
          <Pager count={data.count} page={page} setPage={setPage} />
        )}
      </section>
      {editing && (
        <Modal
          title="Edit listing"
          onClose={() => {
            if (!saving) setEditing(null);
          }}
        >
          <form className="ws-form" onSubmit={save}>
            <div className="flex items-center justify-between mb-5">
              <p>{title(editing)}</p>
              <Link
                className="ws-text-link"
                href={`${pathname}/${editing.id}/edit`}
              >
                Edit full details
                <Icon name="arrow_forward" />
              </Link>
            </div>
            {error && (
              <div className="ws-notice error" role="alert">
                {error}
              </div>
            )}
            <div className="ws-form-grid">
              <label className="ws-field">
                Price (INR)
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={editing.price}
                />
              </label>
              {type === "parts" ? (
                <label className="ws-field">
                  Stock quantity
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={editing.stock}
                  />
                </label>
              ) : (
                <label className="ws-field">
                  Listing status
                  <select name="status" defaultValue={editing.status}>
                    {["draft", "active", "sold", "archived"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {editing.has_auction && (
              <div className="ws-notice">
                This vehicle is linked to an auction. Review the auction before
                changing availability.
              </div>
            )}
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="ws-button" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete listing?"
          onClose={() => {
            if (!saving) setDeleting(null);
          }}
        >
          <div className="ws-form">
            {error && (
              <div className="ws-notice error" role="alert">
                {error}
              </div>
            )}
            <p>
              Delete {title(deleting)}? This removes the listing from the
              marketplace and cannot be undone.
            </p>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                disabled={saving}
                onClick={() => setDeleting(null)}
              >
                Keep listing
              </button>
              <button
                className="ws-button danger"
                disabled={saving}
                onClick={remove}
              >
                {saving ? "Deleting…" : "Delete listing"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
