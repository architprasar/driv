"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import ListingMedia from "./ListingMedia";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Icon,
  LoadState,
  Badge,
  useResource,
  errorMessage,
} from "./WorkspaceUI";
type Listing = {
  id: number;
  name?: string;
  sku?: string;
  year?: number;
  price: string;
  stock?: number;
  status?: string;
  mileage?: number;
  location?: string;
  color?: string;
  variant?: string;
  fuel_type?: string;
  transmission?: string;
  condition?: string;
  description: string;
  is_genuine?: boolean;
  vin?: string;
  brand?: { name: string };
  model?: { name: string };
  category?: { name: string };
};
export default function ListingEditor({
  id,
  type,
  base,
}: {
  id: string;
  type: "cars" | "parts";
  base: string;
}) {
  const { data, error, loading, reload } = useResource<Listing>(
    `/dashboard/workspace/${type}/${id}/`,
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | number | boolean> =
      Object.fromEntries(
        [...form].map(([key, value]) => [key, String(value).trim()]),
      );
    if (type === "parts") {
      payload.stock = Number(form.get("stock"));
      payload.is_genuine = form.get("is_genuine") === "on";
    } else {
      payload.year = Number(form.get("year"));
      payload.mileage = Number(form.get("mileage"));
    }
    setBusy(true);
    setFormError("");
    try {
      await apiClient.patch(`/${type}/${id}/`, payload);
      router.push(base);
      router.refresh();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!data || loading || error)
    return <LoadState loading={loading} error={error} retry={reload} />;
  return (
    <>
      <Link href={base} className="ws-text-link mb-5">
        <Icon name="arrow_back" />
        Back to inventory
      </Link>
      <PageHeader
        title={
          type === "cars"
            ? `${data.year} ${data.brand?.name} ${data.model?.name}`
            : data.name || "Edit part"
        }
        description="Keep the information buyers see accurate and up to date."
        action={
          <Badge
            value={data.status || (data.stock ? "in_stock" : "out_of_stock")}
          />
        }
      />
      {formError && (
        <div className="ws-notice error" role="alert">
          {formError}
        </div>
      )}
      <div className="ws-grid">
        <Panel title="Listing information">
          <form className="ws-form" onSubmit={save}>
            <div className="ws-form-grid">
              {type === "parts" ? (
                <>
                  <label className="ws-field full">
                    Part name
                    <input
                      name="name"
                      defaultValue={data.name}
                      required
                      maxLength={200}
                    />
                  </label>
                  <label className="ws-field">
                    SKU
                    <input
                      name="sku"
                      defaultValue={data.sku}
                      required
                      maxLength={50}
                    />
                  </label>
                  <label className="ws-field">
                    Stock quantity
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={data.stock}
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="ws-field">
                    Year
                    <input
                      name="year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      defaultValue={data.year}
                      required
                    />
                  </label>
                  <label className="ws-field">
                    Mileage (km)
                    <input
                      name="mileage"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={data.mileage}
                      required
                    />
                  </label>
                  <label className="ws-field">
                    Variant
                    <input
                      name="variant"
                      maxLength={100}
                      defaultValue={data.variant}
                    />
                  </label>
                  <label className="ws-field">
                    Colour
                    <input
                      name="color"
                      required
                      maxLength={50}
                      defaultValue={data.color}
                    />
                  </label>
                  <label className="ws-field full">
                    Location
                    <input
                      name="location"
                      required
                      maxLength={200}
                      defaultValue={data.location}
                    />
                  </label>
                  {[
                    [
                      "fuel_type",
                      "Fuel type",
                      ["petrol", "diesel", "electric", "hybrid"],
                    ],
                    ["transmission", "Transmission", ["automatic", "manual"]],
                    [
                      "condition",
                      "Condition",
                      [
                        "new",
                        "like_new",
                        "excellent",
                        "good",
                        "fair",
                        "salvage",
                      ],
                    ],
                    [
                      "status",
                      "Listing status",
                      ["draft", "active", "sold", "archived"],
                    ],
                  ].map(([key, title, options]) => (
                    <label className="ws-field" key={String(key)}>
                      {String(title)}
                      <select
                        name={String(key)}
                        defaultValue={String(data[key as keyof Listing] || "")}
                      >
                        {(options as string[]).map((option) => (
                          <option value={option} key={option}>
                            {option.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </>
              )}
              <label className="ws-field">
                Price (INR)
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={data.price}
                  required
                />
              </label>
              <label className="ws-field full">
                Description
                <textarea
                  name="description"
                  rows={7}
                  defaultValue={data.description}
                  required={type === "parts"}
                />
              </label>
            </div>
            {type === "parts" && (
              <label className="ws-check">
                <input
                  type="checkbox"
                  name="is_genuine"
                  defaultChecked={data.is_genuine}
                />
                Genuine part
              </label>
            )}
            <div className="ws-form-actions">
              <Link className="ws-button secondary" href={base}>
                Cancel
              </Link>
              <button className="ws-button" disabled={busy}>
                {busy ? "Saving…" : "Save listing"}
              </button>
            </div>
          </form>
        </Panel>
        <Panel title="Listing reference">
          <dl className="ws-detail-list">
            <div>
              <dt>Reference</dt>
              <dd>#{data.id}</dd>
            </div>
            <div>
              <dt>{type === "cars" ? "VIN" : "Category"}</dt>
              <dd>{data.vin || data.category?.name}</dd>
            </div>
          </dl>
          <div className="ws-panel-body">
            <p className="text-xs text-slate-500">
              Changes update your marketplace listing. Vehicles linked to an
              open auction cannot change price or availability until the auction
              closes.
            </p>
          </div>
        </Panel>
      </div>
      <ListingMedia type={type} id={id} />
    </>
  );
}
