"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Panel, Icon, errorMessage } from "./WorkspaceUI";
export default function VendorRegistration() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = new FormData(event.currentTarget);
    const form = new FormData();
    for (const [name, value] of raw) {
      if (!(value instanceof File) || value.size) form.append(name, value);
    }
    setBusy(true);
    setError("");
    try {
      await apiClient.post("/vendors/register/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      router.push("/vendor/dashboard");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Set up your business"
        description="Create your vendor workspace for inventory, auctions, and payouts."
      />
      {error && (
        <div className="ws-notice error" role="alert">
          {error}
        </div>
      )}
      <div className="ws-grid">
        <Panel title="Business registration">
          <form className="ws-form" onSubmit={submit}>
            <div className="ws-form-grid">
              <label className="ws-field full">
                Business name
                <input
                  name="business_name"
                  required
                  maxLength={200}
                  autoComplete="organization"
                />
              </label>
              <label className="ws-field">
                Contact person
                <input
                  name="contact_person"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label className="ws-field">
                Tax ID
                <input name="tax_id" maxLength={50} />
              </label>
              <label className="ws-field">
                Business email
                <input
                  type="email"
                  name="business_email"
                  required
                  autoComplete="email"
                />
              </label>
              <label className="ws-field">
                Phone number
                <input
                  type="tel"
                  name="phone"
                  required
                  maxLength={20}
                  autoComplete="tel"
                />
              </label>
              <label className="ws-field full">
                Business license
                <input
                  type="file"
                  name="business_license"
                  accept="application/pdf,image/jpeg,image/png"
                />
              </label>
              <label className="ws-field full">
                Representative ID
                <input
                  type="file"
                  name="representative_id"
                  accept="application/pdf,image/jpeg,image/png"
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Documents can be added later in Business details. PDF, JPG, or
              PNG, up to 10 MB each.
            </p>
            <div className="ws-form-actions">
              <button className="ws-button" disabled={busy}>
                <Icon name="storefront" />
                {busy ? "Creating workspace…" : "Create vendor workspace"}
              </button>
            </div>
          </form>
        </Panel>
        <Panel title="What happens next">
          <div className="ws-panel-body">
            <p className="text-sm text-slate-500 leading-7">
              Your workspace opens as soon as you register. Add your business
              documents to support verification, prepare your vehicle inventory,
              and manage your auction lots.
            </p>
            <p className="text-xs text-slate-500 mt-5">
              Your verification status and membership are shown in Business
              details.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
