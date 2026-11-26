"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  LoadState,
  Modal,
  Badge,
  Icon,
  useResource,
  money,
  date,
  errorMessage,
} from "@/components/workspace/WorkspaceUI";
type Sale = {
  item: {
    id: number;
    name: string;
    quantity: number;
    subtotal: string;
    fulfillment_status: string;
    tracking_number: string;
    carrier: string;
    fulfillment_note: string;
  };
  order: {
    id: number;
    order_number: string;
    status: string;
    payment_status: string;
    currency: string;
    delivery_method: string;
    customer_name: string;
    created_at: string;
    shipping_address: Record<string, string>;
  };
};
export default function SellerSale({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<Sale>(
    `/orders/sales/${id}/`,
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const reject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await apiClient.patch(`/orders/sales/${id}/`, {
        status: "cancelled",
        fulfillment_note: new FormData(event.currentTarget).get("reason"),
      });
      setRejecting(false);
      reload();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await apiClient.patch(
        `/orders/sales/${id}/`,
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!data || loading || error)
    return <LoadState loading={loading} error={error} retry={reload} />;
  const pickup = data.order.delivery_method === "pickup";
  const next =
    data.item.fulfillment_status === "pending"
      ? "processing"
      : data.item.fulfillment_status === "processing"
        ? pickup
          ? "ready_for_pickup"
          : "shipped"
        : data.item.fulfillment_status === "shipped"
          ? "out_for_delivery"
          : null;
  const paid = ["completed", "partially_refunded"].includes(
    data.order.payment_status,
  );
  const a = data.order.shipping_address;
  return (
    <>
      <Link href="/dashboard/sales" className="ws-text-link mb-5">
        <Icon name="arrow_back" />
        All sales
      </Link>
      <PageHeader
        title={data.order.order_number}
        description={`${data.item.name} · ${data.item.quantity} item(s) · ${date(data.order.created_at)}`}
        action={<Badge value={data.item.fulfillment_status} />}
      />
      {formError && (
        <div className="ws-notice error" role="alert">
          {formError}
        </div>
      )}
      {paid &&
        ["pending", "processing"].includes(data.item.fulfillment_status) && (
          <div className="ws-notice">
            <p>
              If this item cannot be supplied, cancel it and initiate the
              customer’s refund.
            </p>
            <button
              className="ws-button secondary"
              disabled={busy}
              onClick={() => {
                setFormError("");
                setRejecting(true);
              }}
            >
              Cannot fulfil this item
            </button>
          </div>
        )}
      <div className="ws-grid">
        <Panel title="Fulfil this item">
          {!paid ? (
            <div className="ws-form">
              <div className="ws-notice">
                Payment has not been completed. Do not prepare or dispatch this
                order yet.
              </div>
            </div>
          ) : next ? (
            <form className="ws-form" onSubmit={submit}>
              <div className="ws-form-grid">
                <label className="ws-field full">
                  Next step
                  <select name="status" defaultValue={next}>
                    <option value={next}>{next.replace(/_/g, " ")}</option>
                  </select>
                </label>
                {next === "shipped" && (
                  <>
                    <label className="ws-field">
                      Courier / carrier
                      <input
                        name="carrier"
                        defaultValue={data.item.carrier}
                        maxLength={100}
                        required
                      />
                    </label>
                    <label className="ws-field">
                      Tracking reference
                      <input
                        name="tracking_number"
                        defaultValue={data.item.tracking_number}
                        maxLength={100}
                        required
                      />
                    </label>
                  </>
                )}
                <label className="ws-field full">
                  Customer update
                  <textarea
                    name="fulfillment_note"
                    rows={4}
                    defaultValue={data.item.fulfillment_note}
                    required={pickup && next === "ready_for_pickup"}
                    placeholder={
                      pickup
                        ? "Share the pickup location, appointment instructions, and handover documents."
                        : "Add any useful preparation or delivery information."
                    }
                  />
                </label>
              </div>
              <div className="ws-form-actions">
                <button className="ws-button" disabled={busy}>
                  {busy ? "Updating…" : "Update fulfilment"}
                </button>
              </div>
            </form>
          ) : (
            <div className="ws-form">
              <p className="text-sm text-slate-500">
                {data.item.fulfillment_status === "delivered"
                  ? "The customer has confirmed receipt. Earnings become eligible after the return window."
                  : data.item.fulfillment_status === "ready_for_pickup" ||
                      data.item.fulfillment_status === "out_for_delivery"
                    ? "Awaiting customer receipt / handover confirmation. The customer can confirm from their order details."
                    : "No further fulfilment action is available for this item."}
              </p>
            </div>
          )}
        </Panel>
        <div>
          <Panel title="Sale summary">
            <dl className="ws-detail-list">
              <div>
                <dt>Item value</dt>
                <dd>{money(data.item.subtotal, data.order.currency)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  <Badge value={data.order.payment_status} />
                </dd>
              </div>
              <div>
                <dt>Customer</dt>
                <dd>{data.order.customer_name}</dd>
              </div>
              <div>
                <dt>Delivery method</dt>
                <dd>{data.order.delivery_method}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title={pickup ? "Pickup / handover" : "Delivery address"}>
            <div className="ws-panel-body">
              {a?.street ? (
                <p className="text-sm leading-7">
                  {a.full_name}
                  <br />
                  {a.street}
                  <br />
                  {a.city}, {a.state} {a.postal_code}
                  <br />
                  {a.country}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Arrange collection with the customer and add clear
                  instructions in the customer update.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
      {rejecting && (
        <Modal
          title="Cancel this sale item?"
          onClose={() => {
            if (!busy) setRejecting(false);
          }}
        >
          <form className="ws-form" onSubmit={reject}>
            {formError && (
              <div className="ws-notice error" role="alert">
                {formError}
              </div>
            )}
            <p className="mb-5">
              This releases the item and initiates a refund to the original
              payment method. Other sellers’ items remain unchanged.
            </p>
            <label className="ws-field">
              Reason
              <textarea name="reason" required minLength={5} rows={4} />
            </label>
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setRejecting(false)}
              >
                Keep sale
              </button>
              <button className="ws-button danger" disabled={busy}>
                {busy ? "Cancelling…" : "Cancel item and refund"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
