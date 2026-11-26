"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  checkoutAttempt,
  checkoutStorageKey,
  rememberCheckout,
  forgetCheckout,
} from "@/lib/checkout-recovery";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  Panel,
  LoadState,
  Modal,
  Icon,
  money,
  errorMessage,
  type PageData,
} from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";

type Address = {
  id: number;
  label: string;
  full_name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};
type Quote = {
  quote_token: string;
  subtotal: string;
  shipping_cost: string;
  tax: string;
  total: string;
  currency: string;
  requires_address: boolean;
  delivery_method: string;
  tax_rate: string;
  return_window_days: number;
  items: {
    id: number;
    item_type: string;
    name: string;
    quantity: number;
    subtotal: string;
  }[];
};
export default function Checkout() {
  const params = useSearchParams();
  const router = useRouter();
  const car = params.get("car");
  const [method, setMethod] = useState("standard");
  const [selected, setSelected] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() => checkoutAttempt(car));
  useEffect(() => {
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(checkoutStorageKey(car));
    } catch {}
    if (!pending) return;
    const controller = new AbortController();
    apiClient
      .get(`/orders/checkout-attempt/?key=${encodeURIComponent(pending)}`, {
        signal: controller.signal,
      })
      .then(({ data }) => {
        forgetCheckout(car);
        router.replace(`/profile/orders/${data.id}`);
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !axios.isCancel(error) &&
          error.response?.status !== 404
        )
          setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [car, router]);
  const addresses = useResource<PageData<Address>>(
    `/auth/addresses/?page=${page}`,
  );
  const quote = useResource<Quote>(
    `/orders/quote/?${new URLSearchParams({ delivery_method: method, ...(car ? { car_id: car } : {}) })}`,
  );
  const chosen =
    selected ||
    addresses.data?.results.find((a) => a.is_default)?.id ||
    addresses.data?.results[0]?.id ||
    null;
  const submit = async () => {
    if (!quote.data) return;
    setBusy(true);
    setError("");
    rememberCheckout(car, key);
    try {
      const { data } = await apiClient.post("/orders/create_from_cart/", {
        checkout_key: key,
        quote_token: quote.data.quote_token,
        delivery_method: quote.data.delivery_method,
        ...(car ? { car_id: Number(car) } : {}),
        ...(chosen ? { shipping_address_id: chosen } : {}),
      });
      forgetCheckout(car);
      router.push(`/profile/orders/${data.id}`);
    } catch (e) {
      setError(errorMessage(e));
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        forgetCheckout(car);
        quote.reload();
      }
    } finally {
      setBusy(false);
    }
  };
  const addAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post(
        "/auth/addresses/",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      setSelected(data.id);
      setAdding(false);
      setPage(1);
      addresses.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="commerce max-w-7xl mx-auto px-5 py-10">
      <PageHeader
        title="Review your order"
        description="Review availability, delivery, and the full price before reserving your items."
      />
      <div className="mb-6">
        <Link href={car ? `/cars/${car}` : "/cart"} className="ws-text-link">
          <Icon name="arrow_back" />
          {car ? "Back to vehicle" : "Back to cart"}
        </Link>
      </div>
      {error && (
        <div className="ws-notice error" role="alert">
          {error}{" "}
          <Link href="/profile/orders" className="underline">
            Review saved orders
          </Link>
        </div>
      )}
      {quote.loading || quote.error || !quote.data ? (
        <LoadState
          loading={quote.loading}
          error={quote.error}
          retry={quote.reload}
        />
      ) : (
        <div className="ws-grid">
          <div>
            <Panel title="Your items">
              <div className="ws-table-scroll">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.data.items.map((item) => (
                      <tr key={`${item.item_type}-${item.id}`}>
                        <td>
                          <strong>{item.name}</strong>
                          <p className="text-xs mt-1">
                            {item.item_type === "car"
                              ? "Vehicle pickup / handover"
                              : "Spare part"}
                          </p>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{money(item.subtotal, quote.data!.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Delivery or collection">
              <div className="ws-form">
                {quote.data.items.every((i) => i.item_type === "car") ? (
                  <div className="ws-notice">
                    <Icon name="key" />
                    <p>
                      Your seller will prepare the vehicle and arrange pickup.
                      Confirm handover after receiving the keys and transfer
                      documents.
                    </p>
                  </div>
                ) : (
                  <label className="ws-field">
                    Delivery method
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      <option value="standard">Standard delivery</option>
                      <option value="express">Express delivery</option>
                      <option value="pickup">Collect from seller</option>
                    </select>
                  </label>
                )}
                {quote.data.items.some((i) => i.item_type === "car") &&
                  !quote.data.items.every((i) => i.item_type === "car") && (
                    <p className="text-xs text-slate-500 mt-4">
                      Vehicles are collected from their seller; the selected
                      delivery method applies to your parts.
                    </p>
                  )}
              </div>
            </Panel>
            {quote.data.requires_address && (
              <Panel
                title="Delivery address"
                action={
                  <button
                    className="ws-text-link"
                    onClick={() => {
                      setAdding(true);
                      setError("");
                    }}
                  >
                    Add address
                  </button>
                }
              >
                {addresses.loading || addresses.error ? (
                  <LoadState
                    loading={addresses.loading}
                    error={addresses.error}
                    retry={addresses.reload}
                  />
                ) : (
                  <div className="ws-form space-y-3">
                    {addresses.data?.results.length ? (
                      addresses.data.results.map((a) => (
                        <label
                          className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 cursor-pointer"
                          key={a.id}
                        >
                          <input
                            type="radio"
                            className="mt-1"
                            name="address"
                            checked={chosen === a.id}
                            onChange={() => setSelected(a.id)}
                          />
                          <span className="text-sm">
                            <strong>
                              {a.label} — {a.full_name}
                            </strong>
                            <span className="block text-xs text-slate-500 mt-1">
                              {a.street}, {a.city}, {a.state} {a.postal_code},{" "}
                              {a.country}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Add a delivery address to continue.
                      </p>
                    )}
                    <div className="ws-row-actions">
                      {page > 1 && (
                        <button onClick={() => setPage(page - 1)}>
                          Previous addresses
                        </button>
                      )}
                      {addresses.data?.next && (
                        <button onClick={() => setPage(page + 1)}>
                          More addresses
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Panel>
            )}
          </div>
          <Panel title="Order summary">
            <dl className="ws-detail-list">
              {[
                ["Subtotal", quote.data.subtotal],
                ["Delivery", quote.data.shipping_cost],
                [`Tax (${Number(quote.data.tax_rate) * 100}%)`, quote.data.tax],
                ["Total", quote.data.total],
              ].map(([title, value]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{money(value, quote.data!.currency)}</dd>
                </div>
              ))}
            </dl>
            <div className="ws-form border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-5">
                Your items will be held while you complete payment. You can
                resume an unpaid order from your account.
              </p>
              <button
                className="ws-button w-full"
                disabled={busy || (quote.data.requires_address && !chosen)}
                onClick={submit}
              >
                {busy
                  ? "Reserving your items…"
                  : "Reserve and continue to payment"}
                <Icon name="arrow_forward" />
              </button>
              <p className="text-xs text-slate-500 mt-4">
                Return requests are available for{" "}
                {quote.data.return_window_days} days after receipt confirmation.
                Vehicle returns require seller review.
              </p>
            </div>
          </Panel>
        </div>
      )}
      {adding && (
        <Modal
          title="Add delivery address"
          onClose={() => {
            if (!busy) setAdding(false);
          }}
        >
          <form className="ws-form" onSubmit={addAddress}>
            {error && <div className="ws-notice error">{error}</div>}
            <div className="ws-form-grid">
              {[
                ["label", "Address label"],
                ["full_name", "Full name"],
                ["street", "Street address"],
                ["city", "City"],
                ["state", "State"],
                ["postal_code", "Postal code"],
                ["country", "Country"],
              ].map(([name, title]) => (
                <label
                  className={`ws-field ${name === "street" ? "full" : ""}`}
                  key={name}
                >
                  {title}
                  <input
                    name={name}
                    required
                    defaultValue={
                      name === "country"
                        ? "India"
                        : name === "label"
                          ? "Home"
                          : ""
                    }
                  />
                </label>
              ))}
            </div>
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button className="ws-button" disabled={busy}>
                {busy ? "Saving…" : "Save address"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
