"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  LoadState,
  Empty,
  Pager,
  Badge,
  Modal,
  useResource,
  date,
  errorMessage,
  type PageData,
} from "@/components/workspace/WorkspaceUI";
type Return = {
  id: number;
  item: number;
  item_name: string;
  order_id: number;
  order_number: string;
  reason: string;
  status: string;
  seller_note: string;
  created_at: string;
};
export default function Returns({ seller = false }: { seller?: boolean }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource<PageData<Return>>(
    `/orders/returns/?role=${seller ? "seller" : "customer"}&page=${page}`,
  );
  const [action, setAction] = useState<{
    record: Return;
    status: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    setBusy(true);
    setFormError("");
    try {
      await apiClient.post(`/orders/returns/${action.record.id}/decision/`, {
        status: action.status,
        seller_note: new FormData(event.currentTarget).get("seller_note"),
      });
      setAction(null);
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Returns & refunds"
        description={
          seller
            ? "Review return requests, arrange collection, and refund received items."
            : "Follow the status of your return requests and refunds."
        }
      />
      <Panel title="Return requests">
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            title="No return requests"
            text={
              seller
                ? "Customer return requests will appear here."
                : "Request a return from the order item after confirming receipt."
            }
            href={seller ? undefined : "/profile/orders"}
            action="View orders"
          />
        ) : (
          data.results.map((record) => (
            <article className="ws-feed-row" key={record.id}>
              <div className="flex-1 min-w-0">
                <h3>{record.item_name}</h3>
                <p>
                  {record.order_number} · {record.reason}
                </p>
                {record.seller_note && (
                  <p className="mt-2">Seller update: {record.seller_note}</p>
                )}
                <small>{date(record.created_at)}</small>
                <div className="mt-3">
                  <Badge value={record.status} />
                </div>
              </div>
              <div className="ws-row-actions flex-wrap">
                {seller && record.status === "requested" && (
                  <>
                    <button
                      onClick={() => {
                        setAction({ record, status: "approved" });
                        setFormError("");
                      }}
                    >
                      Approve return
                    </button>
                    <button
                      onClick={() => {
                        setAction({ record, status: "rejected" });
                        setFormError("");
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
                {seller && record.status === "approved" && (
                  <button
                    onClick={() => {
                      setAction({ record, status: "received" });
                      setFormError("");
                    }}
                  >
                    Confirm received & refund
                  </button>
                )}
                <Link
                  href={
                    seller
                      ? `/dashboard/sales/${record.item}`
                      : `/profile/orders/${record.order_id}`
                  }
                >
                  View {seller ? "sale" : "order"}
                </Link>
              </div>
            </article>
          ))
        )}
        {data && !loading && !error && (
          <Pager count={data.count} page={page} setPage={setPage} />
        )}
      </Panel>
      {action && (
        <Modal
          title={
            action.status === "received"
              ? "Receive return and initiate refund"
              : action.status === "approved"
                ? "Approve return"
                : "Reject return"
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
            <p className="mb-5">
              {action.status === "received"
                ? "Confirm only after physically receiving and checking the returned item. This initiates a refund to the original payment method."
                : action.status === "approved"
                  ? "Provide return instructions, including the return address and collection arrangements."
                  : "Explain the reason for rejecting this return request."}
            </p>
            <label className="ws-field">
              Customer update
              <textarea name="seller_note" rows={5} required minLength={3} />
            </label>
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
                {busy ? "Updating…" : "Confirm decision"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
