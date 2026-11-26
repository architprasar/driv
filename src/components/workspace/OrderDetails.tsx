"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  Badge,
  Icon,
  LoadState,
  Modal,
  useResource,
  date,
  money,
  errorMessage,
} from "./WorkspaceUI";
import PaymentActions, {
  type PaymentInfo,
} from "@/components/commerce/PaymentActions";
type Item = {
  id: number;
  part: number | null;
  car: number | null;
  name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  fulfillment_status: string;
  tracking_number: string;
  carrier: string;
  fulfillment_note: string;
  delivered_at: string | null;
  can_confirm_receipt: boolean;
  can_request_return: boolean;
  can_review: boolean;
  return_request: { id: number; status: string; seller_note: string } | null;
};
type Order = {
  id: number;
  order_number: string;
  status: string;
  subtotal: string;
  tax: string;
  shipping_cost: string;
  total: string;
  currency: string;
  reservation_expires_at: string | null;
  can_cancel: boolean;
  created_at: string;
  delivery_method: string;
  shipping_address: {
    full_name: string;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  payment: PaymentInfo | null;
  items: Item[];
  timeline: {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    status: string;
  }[];
};
export default function OrderDetails({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<Order>(`/orders/${id}/`);
  const [action, setAction] = useState<{
    kind: "cancel" | "received" | "return" | "review";
    item?: Item;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const retryRefund = async (refundId: number) => {
    setBusy(true);
    setFormError("");
    try {
      await apiClient.post(`/orders/${id}/retry-refund/`, {
        refund_id: refundId,
      });
      reload();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action || !data) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFormError("");
    try {
      if (action.kind === "cancel")
        await apiClient.post(`/orders/${data.id}/cancel/`, {
          reason: form.get("reason") || "Cancelled by customer",
        });
      else if (action.kind === "received")
        await apiClient.post(`/orders/items/${action.item!.id}/received/`, {
          handover: {
            keys_received: form.get("keys_received") === "on",
            documents_received: form.get("documents_received") === "on",
          },
        });
      else if (action.kind === "return")
        await apiClient.post("/orders/returns/", {
          item: action.item!.id,
          reason: form.get("reason"),
        });
      else
        await apiClient.post(`/parts/${action.item!.part}/reviews/`, {
          item: action.item!.id,
          rating: Number(form.get("rating")),
          body: form.get("body"),
        });
      setAction(null);
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!data || error || loading)
    return <LoadState loading={loading} error={error} retry={reload} />;
  const begin = (
    kind: "cancel" | "received" | "return" | "review",
    item?: Item,
  ) => {
    setFormError("");
    setAction({ kind, item });
  };
  return (
    <>
      <Link className="ws-text-link mb-5" href="/profile/orders">
        <Icon name="arrow_back" />
        All orders
      </Link>
      <PageHeader
        title={data.order_number}
        description={`Placed ${date(data.created_at)}. Follow every item through delivery or handover.`}
        action={<Badge value={data.status} />}
      />
      {formError && !action && (
        <div className="ws-notice error" role="alert">
          {formError}
        </div>
      )}
      <div className="ws-grid">
        <div>
          <Panel title="Your items">
            {data.items.map((item) => (
              <article key={item.id} className="ws-feed-row">
                <span className="ws-empty-icon">
                  <Icon name={item.car ? "directions_car" : "manufacturing"} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3>{item.name}</h3>
                  <p>
                    {item.quantity} × {money(item.unit_price, data.currency)} ·{" "}
                    <strong>{money(item.subtotal, data.currency)}</strong>
                  </p>
                  <div className="mt-3">
                    <Badge value={item.fulfillment_status} />
                  </div>
                  {item.tracking_number && (
                    <p className="mt-3">
                      {item.carrier || "Tracking reference"}:{" "}
                      {item.tracking_number}
                    </p>
                  )}
                  {item.fulfillment_note && (
                    <p className="mt-2 whitespace-pre-wrap">
                      Seller update: {item.fulfillment_note}
                    </p>
                  )}
                  {item.return_request && (
                    <p className="mt-3">
                      Return: {item.return_request.status.replace(/_/g, " ")}
                      {item.return_request.seller_note
                        ? ` — ${item.return_request.seller_note}`
                        : ""}
                    </p>
                  )}
                  <div className="ws-row-actions mt-4 flex-wrap">
                    {item.can_confirm_receipt && (
                      <button onClick={() => begin("received", item)}>
                        {item.car
                          ? "Confirm vehicle handover"
                          : "Confirm received"}
                      </button>
                    )}
                    {item.can_request_return && (
                      <button onClick={() => begin("return", item)}>
                        Request return
                      </button>
                    )}
                    {item.can_review && (
                      <button onClick={() => begin("review", item)}>
                        Review purchase
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </Panel>
          <Panel title="Order progress">
            {data.timeline.map((item) => (
              <article className="ws-feed-row" key={item.id}>
                <span className="ws-empty-icon">
                  <Icon
                    name={
                      item.status === "delivered"
                        ? "check_circle"
                        : "local_shipping"
                    }
                  />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <small>{date(item.timestamp)}</small>
                </div>
              </article>
            ))}
          </Panel>
        </div>
        <div>
          <PaymentActions order={data} onChange={reload} />
          <Panel title="Order summary">
            <dl className="ws-detail-list">
              {[
                ["Subtotal", data.subtotal],
                ["Delivery", data.shipping_cost],
                ["Tax", data.tax],
                ["Total", data.total],
              ].map(([title, value]) => (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{money(value, data.currency)}</dd>
                </div>
              ))}
              <div>
                <dt>Payment</dt>
                <dd>
                  <Badge value={data.payment?.status || "unpaid"} />
                </dd>
              </div>
              {Number(data.payment?.refunded_amount) > 0 && (
                <div>
                  <dt>Refunds issued</dt>
                  <dd>{money(data.payment!.refunded_amount, data.currency)}</dd>
                </div>
              )}
            </dl>
          </Panel>
          {Boolean(data.payment?.refunds?.length) && (
            <Panel title="Refund updates">
              <div className="ws-panel-body space-y-5">
                {data.payment!.refunds!.map((refund) => (
                  <div key={refund.id}>
                    <div className="flex justify-between gap-4">
                      <strong className="text-sm">
                        {money(refund.amount, data.currency)}
                      </strong>
                      <Badge value={refund.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {refund.reason}
                    </p>
                    {["failed", "canceled"].includes(refund.status) && (
                      <button
                        className="ws-text-link mt-3"
                        disabled={busy}
                        onClick={() => retryRefund(refund.id)}
                      >
                        Retry refund
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
          <Panel
            title={
              data.delivery_method === "pickup"
                ? "Collection / handover"
                : "Delivery address"
            }
          >
            <div className="ws-panel-body">
              {data.shipping_address ? (
                <>
                  <strong className="text-sm">
                    {data.shipping_address.full_name}
                  </strong>
                  <p className="text-xs text-slate-500 mt-2 leading-6">
                    {data.shipping_address.street}
                    <br />
                    {data.shipping_address.city}, {data.shipping_address.state}{" "}
                    {data.shipping_address.postal_code}
                    <br />
                    {data.shipping_address.country}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Your seller will share pickup or vehicle-handover details in
                  the item updates.
                </p>
              )}
            </div>
          </Panel>
          <div className="flex flex-wrap gap-3">
            <Link href="/profile/support" className="ws-button secondary">
              Get help
            </Link>
            {data.can_cancel && (
              <button
                className="ws-button secondary"
                onClick={() => begin("cancel")}
              >
                Cancel order
              </button>
            )}
            {["completed", "partially_refunded", "refunded"].includes(
              data.payment?.status || "",
            ) && (
              <button
                className="ws-button secondary"
                onClick={() => window.print()}
              >
                Print receipt
              </button>
            )}
          </div>
        </div>
      </div>
      {action && (
        <Modal
          title={
            action.kind === "cancel"
              ? "Cancel this order?"
              : action.kind === "received"
                ? "Confirm receipt"
                : action.kind === "return"
                  ? "Request a return"
                  : "Review your purchase"
          }
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <form className="ws-form" onSubmit={submit}>
            {formError && (
              <div className="ws-notice error" role="alert">
                {formError}
              </div>
            )}
            {action.kind === "received" ? (
              <>
                <p>
                  Confirm only after you have received and checked{" "}
                  {action.item!.name}. This starts the return-request window.
                </p>
                {action.item?.car && (
                  <div className="space-y-4 mt-5">
                    <label className="ws-check">
                      <input type="checkbox" name="keys_received" required />I
                      have received the vehicle and its keys
                    </label>
                    <label className="ws-check">
                      <input
                        type="checkbox"
                        name="documents_received"
                        required
                      />
                      I have received the registration / transfer documents
                    </label>
                  </div>
                )}
              </>
            ) : action.kind === "review" ? (
              <div className="ws-form-grid">
                <label className="ws-field">
                  Rating
                  <select name="rating">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ws-field full">
                  Your review
                  <textarea
                    name="body"
                    rows={5}
                    required
                    minLength={5}
                    maxLength={2000}
                  />
                </label>
              </div>
            ) : (
              <>
                <p className="mb-5">
                  {action.kind === "cancel"
                    ? "Unfulfilled items will be released. Any confirmed payment will be refunded to the original method."
                    : "Describe the issue. The seller will review your request and arrange the return before a refund is initiated."}
                </p>
                <label className="ws-field">
                  Reason
                  <textarea name="reason" rows={4} required minLength={5} />
                </label>
              </>
            )}
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Back
              </button>
              <button className="ws-button" disabled={busy}>
                {busy
                  ? "Saving…"
                  : action.kind === "cancel"
                    ? "Cancel order"
                    : action.kind === "received"
                      ? "Confirm received"
                      : action.kind === "return"
                        ? "Send return request"
                        : "Publish review"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
