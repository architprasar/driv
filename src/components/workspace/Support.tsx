"use client";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  Panel,
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
type Ticket = {
  id: number;
  subject: string;
  message: string;
  status: string;
  priority: string;
  replies: {
    id: number;
    body: string;
    from_staff: boolean;
    created_at: string;
  }[];
  created_at: string;
};
export default function Support() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<PageData<Ticket>>(
    `/support/tickets/?page=${page}`,
  );
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFormError("");
    try {
      await apiClient.post("/support/tickets/", Object.fromEntries(form));
      setCreating(false);
      setMessage("Your support request has been received.");
      if (page !== 1) setPage(1);
      else reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const reply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const element = event.currentTarget;
    setBusy(true);
    setFormError("");
    try {
      const { data: updated } = await apiClient.post(
        `/support/tickets/${selected.id}/replies/`,
        Object.fromEntries(new FormData(element)),
      );
      element.reset();
      setSelected(updated);
      reload();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Help & support"
        description="Get help with an order, listing, auction, or your account."
        action={
          <button
            className="ws-button"
            onClick={() => {
              setCreating(true);
              setFormError("");
            }}
          >
            <Icon name="add" />
            New support request
          </button>
        }
      />
      {message && (
        <div className="ws-notice success" role="status">
          {message}
        </div>
      )}
      <Panel title="Your support requests">
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            icon="support_agent"
            title="How can we help?"
            text="Create a support request and keep track of its status here."
          />
        ) : (
          <div className="ws-table-scroll">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.results.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.subject}</strong>
                      <p className="text-[10px]">Request #{ticket.id}</p>
                    </td>
                    <td className="capitalize">{ticket.priority}</td>
                    <td>
                      <Badge value={ticket.status} />
                    </td>
                    <td>{date(ticket.created_at)}</td>
                    <td>
                      <button
                        className="ws-text-link"
                        onClick={() => {
                          setFormError("");
                          setSelected(ticket);
                        }}
                      >
                        View request
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && data && (
          <Pager count={data.count} page={page} setPage={setPage} size={20} />
        )}
      </Panel>
      {creating && (
        <Modal
          title="New support request"
          onClose={() => {
            if (!busy) setCreating(false);
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
                Subject
                <input
                  name="subject"
                  required
                  maxLength={200}
                  placeholder="What do you need help with?"
                />
              </label>
              <label className="ws-field full">
                How urgent is this?
                <select name="priority" defaultValue="medium">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="ws-field full">
                Details
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Include an order number or listing reference if you have one."
                />
              </label>
            </div>
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button className="ws-button" disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          title={`Request #${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <div className="ws-form">
            <div className="flex items-center justify-between mb-5">
              <strong>{selected.subject}</strong>
              <Badge value={selected.status} />
            </div>
            <p className="whitespace-pre-wrap">{selected.message}</p>
            <p className="mt-6">Created {date(selected.created_at)}</p>
            <div className="mt-6 space-y-4" aria-label="Conversation">
              {(selected.replies || []).map((reply) => (
                <article className="rounded-lg border p-4" key={reply.id}>
                  <strong>{reply.from_staff ? "Drivio support" : "You"}</strong>
                  <p className="mt-2 whitespace-pre-wrap">{reply.body}</p>
                  <small>{date(reply.created_at)}</small>
                </article>
              ))}
            </div>
            <form onSubmit={reply} className="mt-6 space-y-4">
              {formError && (
                <div role="alert" className="ws-notice error">
                  {formError}
                </div>
              )}
              <label className="ws-field">
                Add a reply
                <textarea
                  name="body"
                  required
                  minLength={5}
                  maxLength={5000}
                  rows={4}
                />
              </label>
              <p className="text-xs text-slate-500">
                A reply reopens a resolved or closed request.
              </p>
              <button className="ws-button" disabled={busy}>
                {busy ? "Sending…" : "Send reply"}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
