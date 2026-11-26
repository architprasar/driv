"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { AxiosResponse } from "axios";
import {
  PageHeader,
  Panel,
  LoadState,
  Icon,
  errorMessage,
} from "@/components/workspace/WorkspaceUI";
type Option = { id: number; name: string };
function useCatalogue(url: string) {
  const [state, setState] = useState<{
    options: Option[];
    error: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        let next: string | null = url;
        const all: Option[] = [];
        for (let i = 0; next && i < 100; i++) {
          const response: AxiosResponse<
            Option[] | { results: Option[]; next: string | null }
          > = await apiClient.get<
            Option[] | { results: Option[]; next: string | null }
          >(next, { signal: controller.signal });
          const body: Option[] | { results: Option[]; next: string | null } =
            response.data;
          all.push(...(Array.isArray(body) ? body : body.results || []));
          next =
            !Array.isArray(body) && body.next
              ? new URL(body.next).pathname.replace(/^\/api/, "") +
                new URL(body.next).search
              : null;
        }
        if (!controller.signal.aborted) setState({ options: all, error: "" });
      } catch (e) {
        if (!controller.signal.aborted)
          setState({ options: [], error: errorMessage(e) });
      }
    })();
    return () => controller.abort();
  }, [url]);
  return state;
}
function ModelSelect({ brand }: { brand: string }) {
  const options = useCatalogue(`/cars/brands/${brand}/models/`);
  return (
    <label className="ws-field">
      Model
      <select name="model_id" required defaultValue="" key={brand}>
        <option value="">
          {options ? "Choose a model" : "Loading models…"}
        </option>
        {options?.options.map((item) => (
          <option value={item.id} key={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {options?.error && (
        <small className="text-red-600">{options.error}</small>
      )}
    </label>
  );
}
export default function ListingCreate({
  type = "cars",
}: {
  type?: "cars" | "parts";
}) {
  const catalogue = useCatalogue(
    type === "cars" ? "/cars/brands/" : "/parts/categories/",
  );
  const brands = useCatalogue("/cars/brands/");
  const [brand, setBrand] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const urls = useRef<string[]>([]);
  const [draft, setDraft] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const router = useRouter();
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files);
    if (photos.length + next.length > 10) {
      setError("Choose up to ten photos.");
      return;
    }
    if (
      next.some(
        (file) =>
          file.size > 10 * 1024 * 1024 || !file.type.startsWith("image/"),
      )
    ) {
      setError("Choose image files up to 10 MB each.");
      return;
    }
    setPhotos((old) => [
      ...old,
      ...next.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        return { file, url };
      }),
    ]);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const common = {
      price: form.get("price"),
      description: form.get("description"),
    };
    const payload =
      type === "cars"
        ? {
            ...common,
            brand_id: Number(brand),
            model_id: Number(form.get("model_id")),
            year: Number(form.get("year")),
            mileage: Number(form.get("mileage")),
            fuel_type: form.get("fuel_type"),
            transmission: form.get("transmission"),
            color: form.get("color"),
            vin: String(form.get("vin")).trim().toUpperCase(),
            location: form.get("location"),
            variant: form.get("variant"),
            condition: form.get("condition"),
            status: "draft",
          }
        : {
            ...common,
            name: form.get("name"),
            category_id: Number(form.get("category_id")),
            sku: form.get("sku"),
            condition: form.get("condition"),
            is_genuine: form.get("is_genuine") === "on",
            compatible_brand_ids: form
              .getAll("compatible_brand_ids")
              .map(Number),
            stock: 0,
          };
    try {
      setProgress("Saving listing details…");
      let id = draft;
      if (id) await apiClient.patch(`/${type}/${id}/`, payload);
      else {
        const { data } = await apiClient.post(`/${type}/`, payload);
        id = data.id;
        setDraft(id);
      }
      for (let i = uploaded; i < photos.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${photos.length}…`);
        const image = new FormData();
        image.append("image", photos[i].file);
        await apiClient.post(`/${type}/${id}/images/`, image, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUploaded(i + 1);
      }
      setProgress("Publishing your listing…");
      await apiClient.patch(
        `/${type}/${id}/`,
        type === "cars"
          ? { status: "active" }
          : { stock: Number(form.get("stock")) },
      );
      router.push(`/dashboard/${type}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setProgress("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title={type === "cars" ? "List a vehicle" : "List a part"}
        description="Give buyers accurate details, clear photos, and your asking price."
      />
      {error && (
        <div className="ws-notice error" role="alert">
          {error}
          {draft && (
            <p>
              Your listing details are saved. Retry here to continue uploading
              and publishing.
            </p>
          )}
        </div>
      )}
      {!catalogue ? (
        <LoadState loading={true} error="" retry={() => {}} />
      ) : catalogue.error ? (
        <p role="alert">{catalogue.error}</p>
      ) : (
        <div className="ws-grid">
          <Panel title="Listing details">
            <form className="ws-form" onSubmit={submit}>
              <div className="ws-form-grid">
                {type === "cars" ? (
                  <>
                    <label className="ws-field">
                      Brand
                      <select
                        name="brand_id"
                        required
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      >
                        <option value="">Choose a brand</option>
                        {catalogue.options.map((item) => (
                          <option value={item.id} key={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {brand ? (
                      <ModelSelect brand={brand} />
                    ) : (
                      <label className="ws-field">
                        Model
                        <select disabled>
                          <option>Choose a brand first</option>
                        </select>
                      </label>
                    )}
                    <label className="ws-field">
                      Year
                      <input
                        type="number"
                        name="year"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        required
                      />
                    </label>
                    <label className="ws-field">
                      Mileage (km)
                      <input
                        type="number"
                        name="mileage"
                        min="0"
                        step="1"
                        required
                      />
                    </label>
                    <label className="ws-field">
                      Variant
                      <input name="variant" maxLength={100} />
                    </label>
                    <label className="ws-field">
                      Colour
                      <input name="color" required maxLength={50} />
                    </label>
                    <label className="ws-field full">
                      VIN / chassis number
                      <input name="vin" required maxLength={17} />
                    </label>
                    <label className="ws-field full">
                      Vehicle location
                      <input
                        name="location"
                        required
                        maxLength={200}
                        placeholder="City and locality"
                      />
                    </label>
                    <label className="ws-field">
                      Fuel type
                      <select name="fuel_type">
                        <option>petrol</option>
                        <option>diesel</option>
                        <option>electric</option>
                        <option>hybrid</option>
                      </select>
                    </label>
                    <label className="ws-field">
                      Transmission
                      <select name="transmission">
                        <option>automatic</option>
                        <option>manual</option>
                      </select>
                    </label>
                    <label className="ws-field">
                      Condition
                      <select name="condition">
                        {[
                          "new",
                          "like_new",
                          "excellent",
                          "good",
                          "fair",
                          "salvage",
                        ].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="ws-field full">
                      Part name
                      <input name="name" required maxLength={200} />
                    </label>
                    <label className="ws-field">
                      Category
                      <select name="category_id" required defaultValue="">
                        <option value="">Choose a category</option>
                        {catalogue.options.map((item) => (
                          <option value={item.id} key={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ws-field">
                      SKU / part number
                      <input name="sku" required maxLength={50} />
                    </label>
                    <label className="ws-field">
                      Available stock
                      <input
                        type="number"
                        name="stock"
                        required
                        min="1"
                        step="1"
                        defaultValue={1}
                      />
                    </label>
                    <label className="ws-field">
                      Condition
                      <select name="condition">
                        <option>used</option>
                        <option>new</option>
                        <option>refurbished</option>
                      </select>
                    </label>
                    <label className="ws-field full">
                      Compatible brands
                      <select name="compatible_brand_ids" multiple size={4}>
                        {brands?.options.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <small>
                        Select only brands this part fits. Include model, year
                        and fitment details below.
                      </small>
                    </label>
                  </>
                )}
                <label className="ws-field">
                  Asking price (INR)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="price"
                    required
                  />
                </label>
                <label className="ws-field full">
                  Description
                  <textarea
                    name="description"
                    required
                    rows={6}
                    placeholder="Describe the item, its condition, history, and anything a buyer should know."
                  />
                </label>
                <label className="ws-field full">
                  Photos
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                  <small>Up to ten clear images, 10 MB each.</small>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {photos.map((photo, index) => (
                  <div key={photo.url}>
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={photo.url}
                        alt={`Selected photo ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                    </div>
                    {index >= uploaded && (
                      <button
                        type="button"
                        className="ws-text-link mt-2"
                        disabled={busy}
                        onClick={() =>
                          setPhotos((old) => old.filter((_, i) => i !== index))
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {type === "parts" && (
                <label className="ws-check">
                  <input type="checkbox" name="is_genuine" />I declare this is a
                  genuine manufacturer part
                </label>
              )}
              <div className="ws-form-actions">
                <Link
                  href={`/dashboard/${type}`}
                  className="ws-button secondary"
                >
                  Back to inventory
                </Link>
                <button className="ws-button" disabled={busy}>
                  {busy ? progress : "Publish listing"}
                  <Icon name="publish" />
                </button>
              </div>
            </form>
          </Panel>
          <Panel title="Before you publish">
            <div className="ws-panel-body">
              <p className="text-sm text-slate-500 leading-7">
                Describe the condition honestly, photograph any damage, and
                confirm your price and availability. Buyers can contact you
                through enquiries before purchasing.
              </p>
              <p className="text-xs text-slate-500 mt-5">
                For an auction, publish your vehicle first, then create an
                auction lot from your auction dashboard.
              </p>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
