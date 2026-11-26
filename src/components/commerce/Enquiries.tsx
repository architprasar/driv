"use client";
import { useState, type FormEvent } from "react";
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
type Enquiry = {
  id: number;
  car?: number;
  car_title?: string;
  part?: number;
  part_title?: string;
  kind?: string;
  customer_name: string;
  phone: string;
  message: string;
  preferred_at?: string;
  scheduled_at?: string;
  status: string;
  seller_note: string;
  created_at: string;
};
export default function Enquiries({ seller = false }: { seller?: boolean }) {
  const [type, setType] = useState("cars");
  const [page, setPage] = useState(1);
  const endpoint = type === "cars" ? "/cars/enquiries/" : "/parts/questions/";
  const { data, error, loading, reload } = useResource<PageData<Enquiry>>(
    `${endpoint}?role=${seller ? "seller" : "customer"}&page=${page}`,
  );
  const [action, setAction] = useState<{
    record: Enquiry;
    status: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    setBusy(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.patch(`${endpoint}${action.record.id}/`, {
        status: action.status,
        seller_note: form.get("seller_note"),
        ...(form.get("scheduled_at")
          ? {
              scheduled_at: new Date(
                String(form.get("scheduled_at")),
              ).toISOString(),
            }
          : {}),
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
        title="Messages & enquiries"
        description={
          seller
            ? "Reply to product questions and arrange vehicle test drives."
            : "Follow your product questions, seller replies, and test-drive requests."
        }
      />
      <Panel
        title="Your conversations"
        action={
          <select
            aria-label="Product type"
            className="border rounded-md px-3 py-2 text-xs"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="cars">Vehicles</option>
            <option value="parts">Parts</option>
          </select>
        }
      >
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            title="No enquiries yet"
            text={
              seller
                ? "Questions and test-drive requests for your listings appear here."
                : "Ask a seller a question or request a test drive from a product page."
            }
          />
        ) : (
          data.results.map((record) => (
            <article className="ws-feed-row" key={record.id}>
              <div className="flex-1 min-w-0">
                <h3>{record.car_title || record.part_title}</h3>
                <p>
                  {record.kind === "test_drive"
                    ? "Test-drive request"
                    : "Product question"}
                  {seller ? ` from ${record.customer_name}` : ""}
                </p>
                {record.message && (
                  <p className="mt-3 whitespace-pre-wrap">{record.message}</p>
                )}
                {record.preferred_at && (
                  <p className="mt-2">
                    Preferred:{" "}
                    {new Date(record.preferred_at).toLocaleString("en-IN")}
                  </p>
                )}
                {record.scheduled_at && (
                  <p className="mt-2">
                    Scheduled:{" "}
                    {new Date(record.scheduled_at).toLocaleString("en-IN")}
                  </p>
                )}
                {record.seller_note && (
                  <p className="mt-3 whitespace-pre-wrap">
                    Seller reply: {record.seller_note}
                  </p>
                )}
                {seller && <p className="mt-2">Contact: {record.phone}</p>}
                <small>{date(record.created_at)}</small>
                <div className="mt-3">
                  <Badge value={record.status} />
                </div>
              </div>
              <div className="ws-row-actions flex-wrap">
                {seller && record.status === "requested" && (
                  <button
                    onClick={() => {
                      setAction({
                        record,
                        status:
                          record.kind === "test_drive"
                            ? "scheduled"
                            : "completed",
                      });
                      setFormError("");
                    }}
                  >
                    {record.kind === "test_drive"
                      ? "Schedule test drive"
                      : "Reply"}
                  </button>
                )}
                {seller && record.status === "scheduled" && (
                  <button
                    onClick={() => {
                      setAction({ record, status: "completed" });
                      setFormError("");
                    }}
                  >
                    Mark completed
                  </button>
                )}
                {["requested", "scheduled"].includes(record.status) && (
                  <button
                    onClick={() => {
                      setAction({ record, status: "cancelled" });
                      setFormError("");
                    }}
                  >
                    Cancel request
                  </button>
                )}
              </div>
            </article>
          ))
        )}
        {data && !loading && !error && (
          <Pager
            count={data.count}
            page={page}
            setPage={setPage}
            size={type === "parts" ? 20 : 10}
          />
        )}
      </Panel>
      {action && (
        <Modal
          title={
            action.status === "scheduled"
              ? "Schedule test drive"
              : action.status === "cancelled"
                ? "Cancel enquiry"
                : "Update enquiry"
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
            <div className="ws-form-grid">
              {action.status === "scheduled" && (
                <label className="ws-field full">
                  Appointment date and time
                  <input name="scheduled_at" type="datetime-local" required />
                </label>
              )}
              {seller && (
                <label className="ws-field full">
                  Reply / instructions
                  <textarea
                    name="seller_note"
                    rows={5}
                    required={action.status !== "cancelled"}
                  />
                </label>
              )}
              {!seller && (
                <p className="text-sm text-slate-500">
                  Cancel this enquiry? You can send a new request from the
                  product page.
                </p>
              )}
            </div>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                type="button"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Back
              </button>
              <button className="ws-button" disabled={busy}>
                {busy ? "Updating…" : "Confirm update"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
