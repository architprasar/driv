"use client";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  LoadState,
  Empty,
  Badge,
  Icon,
  Pager,
  Modal,
  errorMessage,
  type PageData,
} from "./WorkspaceUI";
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
const fields = [
  ["label", "Address label", "Home or office"],
  ["full_name", "Full name", "Recipient’s name"],
  ["street", "Street address", "House, building and street"],
  ["city", "City", "City"],
  ["state", "State", "State"],
  ["postal_code", "Postal code", "Postal code"],
  ["country", "Country", "Country"],
] as const;
export default function Addresses() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<PageData<Address>>(
    `/auth/addresses/?page=${page}`,
  );
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(
        fields.map(([name]) => [name, String(form.get(name)).trim()]),
      ),
      is_default: form.get("is_default") === "on",
    };
    setSaving(true);
    setFormError("");
    try {
      if (editing?.id)
        await apiClient.patch(`/auth/addresses/${editing.id}/`, payload);
      else await apiClient.post("/auth/addresses/", payload);
      setEditing(null);
      setPage(1);
      setMessage("Address saved.");
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setFormError("");
    try {
      await apiClient.delete(`/auth/addresses/${deleting.id}/`);
      setDeleting(null);
      setMessage("Address deleted.");
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Delivery addresses"
        description="Keep your delivery details ready for your next purchase."
        action={
          <button
            className="ws-button"
            onClick={() => {
              setEditing({ country: "India" });
              setFormError("");
            }}
          >
            <Icon name="add" />
            Add address
          </button>
        }
      />
      {message && (
        <div className="ws-notice success" role="status">
          <Icon name="check_circle" />
          {message}
        </div>
      )}
      {loading || error ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : !data?.results.length ? (
        <div className="ws-panel">
          <Empty
            icon="location_on"
            title="Where should we deliver?"
            text="Add an address to make your next checkout easier."
          />
        </div>
      ) : (
        <>
          <div className="ws-address-grid">
            {data.results.map((address) => (
              <article className="ws-address" key={address.id}>
                <div className="ws-address-head">
                  <h2>{address.label}</h2>
                  {address.is_default && <Badge value="default" />}
                </div>
                <strong className="text-sm">{address.full_name}</strong>
                <p>
                  {address.street}
                  <br />
                  {address.city}, {address.state} {address.postal_code}
                  <br />
                  {address.country}
                </p>
                <div className="ws-row-actions">
                  <button
                    onClick={() => {
                      setEditing(address);
                      setFormError("");
                    }}
                  >
                    Edit address
                  </button>
                  <button
                    onClick={() => {
                      setDeleting(address);
                      setFormError("");
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          <Pager count={data.count} page={page} setPage={setPage} size={20} />
        </>
      )}
      {editing && (
        <Modal
          title={editing.id ? "Edit address" : "Add address"}
          onClose={() => {
            if (!saving) setEditing(null);
          }}
        >
          <form className="ws-form" onSubmit={save}>
            {formError && (
              <div className="ws-notice error" role="alert">
                {formError}
              </div>
            )}
            <div className="ws-form-grid">
              {fields.map(([name, title, placeholder]) => (
                <label
                  className={`ws-field ${name === "street" ? "full" : ""}`}
                  key={name}
                >
                  {title}
                  <input
                    required
                    name={name}
                    defaultValue={String(editing[name] || "")}
                    placeholder={placeholder}
                    maxLength={
                      name === "street"
                        ? 500
                        : name === "postal_code" || name === "label"
                          ? 20
                          : 100
                    }
                  />
                </label>
              ))}
            </div>
            <label className="ws-check">
              <input
                type="checkbox"
                name="is_default"
                defaultChecked={editing.is_default}
              />
              Use as my default delivery address
            </label>
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
                {saving ? "Saving…" : "Save address"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete address?"
          onClose={() => {
            if (!saving) setDeleting(null);
          }}
        >
          <div className="ws-form">
            {formError && <div className="ws-notice error">{formError}</div>}
            <p>
              Remove your {deleting.label} address? It will no longer be
              available for future checkouts.
            </p>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                disabled={saving}
                onClick={() => setDeleting(null)}
              >
                Keep address
              </button>
              <button
                className="ws-button danger"
                disabled={saving}
                onClick={remove}
              >
                {saving ? "Deleting…" : "Delete address"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
