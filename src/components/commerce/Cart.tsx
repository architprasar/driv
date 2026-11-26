"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/runtime-config";
import {
  PageHeader,
  Panel,
  LoadState,
  Empty,
  Icon,
  useResource,
  money,
  errorMessage,
} from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";
type CartData = {
  items: {
    id: number;
    part: number | null;
    car: number | null;
    item_type: string;
    quantity: number;
    item_name: string;
    subtotal: string;
    unit_price: string;
    item_image: string | null;
  }[];
  total: string;
};
export default function Cart() {
  const { data, loading, error, reload } = useResource<CartData>("/cart/");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = async (id: number, quantity?: number) => {
    setBusy(true);
    setMessage("");
    try {
      if (quantity === undefined) await apiClient.delete(`/cart/items/${id}/`);
      else await apiClient.patch(`/cart/items/${id}/`, { quantity });
      reload();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="commerce max-w-7xl mx-auto px-5 py-10">
      <PageHeader
        title="Your cart"
        description="Review your items before checking availability and delivery."
        action={
          <Link href="/parts" className="ws-button secondary">
            Continue shopping
          </Link>
        }
      />
      {message && (
        <div className="ws-notice error" role="alert">
          {message}
        </div>
      )}
      {loading || error || !data ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : !data.items.length ? (
        <div className="ws-panel">
          <Empty
            title="Your cart is ready for something useful"
            text="Explore parts or find your next vehicle."
            href="/parts"
            action="Explore parts"
            icon="shopping_cart"
          />
        </div>
      ) : (
        <div className="ws-grid">
          <Panel
            title={`${data.items.length} item${data.items.length === 1 ? "" : "s"}`}
          >
            <div className="ws-table-scroll">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          href={`/${item.item_type === "car" ? "cars" : "parts"}/${item.car || item.part}`}
                          className="ws-item"
                        >
                          <span className="ws-item-image">
                            {item.item_image ? (
                              <Image
                                src={getMediaUrl(item.item_image)}
                                alt=""
                                fill
                                sizes="72px"
                              />
                            ) : (
                              <Icon
                                name={
                                  item.item_type === "car"
                                    ? "directions_car"
                                    : "manufacturing"
                                }
                              />
                            )}
                          </span>
                          <div>
                            <strong>{item.item_name}</strong>
                            <small>{money(item.unit_price)} each</small>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div className="ws-row-actions">
                          {item.item_type === "part" && (
                            <button
                              aria-label={`Decrease ${item.item_name} quantity`}
                              disabled={busy || item.quantity <= 1}
                              onClick={() => update(item.id, item.quantity - 1)}
                            >
                              −
                            </button>
                          )}
                          <span>{item.quantity}</span>
                          {item.item_type === "part" && (
                            <button
                              aria-label={`Increase ${item.item_name} quantity`}
                              disabled={busy}
                              onClick={() => update(item.id, item.quantity + 1)}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="ws-number">{money(item.subtotal)}</td>
                      <td>
                        <button
                          className="ws-text-link"
                          disabled={busy}
                          onClick={() => update(item.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Cart summary">
            <dl className="ws-detail-list">
              <div>
                <dt>Items subtotal</dt>
                <dd>{money(data.total)}</dd>
              </div>
            </dl>
            <div className="ws-form border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-5">
                Final delivery and tax are calculated at checkout. Items are
                reserved only after you place an order.
              </p>
              <Link href="/checkout" className="ws-button w-full">
                Continue to checkout
                <Icon name="arrow_forward" />
              </Link>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
