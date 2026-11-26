"use client";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  Panel,
  LoadState,
  Icon,
  Badge,
  errorMessage,
} from "./WorkspaceUI";
import { VendorOnboarding } from "./Overview";
type BusinessData = {
  id: number;
  business_name: string;
  tax_id: string;
  contact_person: string;
  business_email: string;
  phone: string;
  verification_status: string;
  tier: string;
  has_business_license: boolean;
  has_representative_id: boolean;
};
export default function Business() {
  const { data, error, loading, reload } = useResource<BusinessData>(
    "/dashboard/workspace/business/",
  );
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const download = async (kind: string) => {
    if (!data) return;
    setBusy(true);
    setFormError("");
    try {
      const response = await apiClient.get(
        `/vendors/documents/${data.id}/${kind}/`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const type = String(response.headers["content-type"] || "");
      link.download = `${kind}.${type.includes("pdf") ? "pdf" : type.includes("png") ? "png" : "jpg"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.patch("/vendors/dashboard/", Object.fromEntries(form));
      setMessage("Business details updated.");
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const raw = new FormData(element);
    const form = new FormData();
    for (const [key, value] of raw) {
      if (value instanceof File && value.size) form.append(key, value);
    }
    if (!Array.from(form.keys()).length) {
      setFormError("Choose at least one document to upload.");
      return;
    }
    setBusy(true);
    setFormError("");
    setMessage("");
    try {
      await apiClient.patch("/vendors/register/documents/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      element.reset();
      setMessage("Documents uploaded.");
      reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (error.includes("Complete vendor")) return <VendorOnboarding />;
  return (
    <>
      <PageHeader
        title="Business details"
        description="Maintain your business identity, contact details, and verification documents. Changes require a fresh verification review."
      />
      {(message || formError) && (
        <div
          className={`ws-notice ${formError ? "error" : "success"}`}
          role={formError ? "alert" : "status"}
        >
          {formError || message}
        </div>
      )}
      {loading || error || !data ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : (
        <>
          <div className="ws-grid">
            <Panel title="Business information">
              <form className="ws-form" onSubmit={save}>
                <div className="ws-form-grid">
                  {[
                    ["business_name", "Business name"],
                    ["tax_id", "Tax ID"],
                    ["contact_person", "Contact person"],
                    ["business_email", "Business email"],
                    ["phone", "Phone number"],
                  ].map(([key, title]) => (
                    <label
                      className={`ws-field ${key === "business_name" ? "full" : ""}`}
                      key={key}
                    >
                      {title}
                      <input
                        name={key}
                        type={
                          key === "business_email"
                            ? "email"
                            : key === "phone"
                              ? "tel"
                              : "text"
                        }
                        defaultValue={String(data[key as keyof BusinessData])}
                        required={key !== "tax_id"}
                      />
                    </label>
                  ))}
                </div>
                <div className="ws-form-actions">
                  <button className="ws-button" disabled={busy}>
                    {busy ? "Saving…" : "Save business details"}
                  </button>
                </div>
              </form>
            </Panel>
            <Panel title="Verification">
              <dl className="ws-detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Badge value={data.verification_status} />
                  </dd>
                </div>
                <div>
                  <dt>Membership</dt>
                  <dd className="capitalize">{data.tier}</dd>
                </div>
                <div>
                  <dt>Business license</dt>
                  <dd>
                    <Icon
                      name={
                        data.has_business_license ? "check_circle" : "pending"
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Representative ID</dt>
                  <dd>
                    <Icon
                      name={
                        data.has_representative_id ? "check_circle" : "pending"
                      }
                    />
                  </dd>
                </div>
              </dl>
              <div className="ws-form space-y-3">
                {data.has_business_license && (
                  <button
                    className="ws-button secondary"
                    disabled={busy}
                    onClick={() => download("business-license")}
                  >
                    Download business license
                  </button>
                )}
                {data.has_representative_id && (
                  <button
                    className="ws-button secondary"
                    disabled={busy}
                    onClick={() => download("representative-id")}
                  >
                    Download representative ID
                  </button>
                )}
                <p className="text-xs text-slate-500">
                  Verification files are private to your account and authorised
                  staff.
                </p>
              </div>
            </Panel>
          </div>
          <div className="ws-grid">
            <Panel title="Business documents">
              <form className="ws-form" onSubmit={upload}>
                <p className="text-xs text-slate-500 mb-6">
                  Upload a clear PDF or image of each document. Uploading a
                  replacement updates the document on file and sends your
                  business back for review.
                </p>
                <div className="ws-form-grid">
                  <label className="ws-field full">
                    Business license
                    <input
                      name="business_license"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                    />
                  </label>
                  <label className="ws-field full">
                    Representative ID
                    <input
                      name="representative_id"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                    />
                  </label>
                </div>
                <div className="ws-form-actions">
                  <button className="ws-button" disabled={busy}>
                    <Icon name="upload" />
                    {busy ? "Uploading…" : "Upload documents"}
                  </button>
                </div>
              </form>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
