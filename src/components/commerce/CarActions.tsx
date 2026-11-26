"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { apiClient } from "@/lib/api-client";
import {
  Modal,
  Icon,
  errorMessage,
  Badge,
} from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";
export default function CarActions({
  car,
}: {
  car: {
    id: number;
    status: string;
    commerce?: { available_for_purchase: boolean; auction_id: number | null };
  };
}) {
  const [kind, setKind] = useState<"test_drive" | "question" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!Cookies.get("session_present")) return;
    const controller = new AbortController();
    apiClient
      .get(`/cars/${car.id}/save/`, { signal: controller.signal })
      .then(({ data }) => setSaved(data.saved))
      .catch(() => {});
    return () => controller.abort();
  }, [car.id]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.post("/cars/enquiries/", {
        car: car.id,
        kind,
        phone: form.get("phone"),
        message: form.get("message"),
        ...(kind === "test_drive"
          ? {
              preferred_at: new Date(
                String(form.get("preferred_at")),
              ).toISOString(),
            }
          : {}),
      });
      setKind(null);
      setMessage(
        kind === "test_drive"
          ? "Test-drive request sent. Follow it in your account enquiries."
          : "Your question was sent to the seller. Replies appear in your account enquiries.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (saved) await apiClient.delete(`/cars/${car.id}/save/`);
      else await apiClient.post(`/cars/${car.id}/save/`);
      setSaved(!saved);
      setMessage(
        saved
          ? "Vehicle removed from your saved list."
          : "Vehicle saved to your account.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          url: window.location.href,
          title: document.title,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Vehicle link copied.");
      }
    } catch {
      setMessage("Copy the address from your browser to share this vehicle.");
    }
  };
  return (
    <div className="commerce">
      <div className="flex flex-wrap gap-3">
        {car.commerce?.available_for_purchase ? (
          <Link href={`/checkout?car=${car.id}`} className="ws-button">
            <Icon name="shopping_bag" />
            Buy this vehicle
          </Link>
        ) : car.commerce?.auction_id ? (
          <Link
            href={`/auctions/${car.commerce.auction_id}`}
            className="ws-button"
          >
            <Icon name="gavel" />
            Open auction
          </Link>
        ) : (
          <Badge value={car.status} />
        )}
        <button
          className="ws-button secondary"
          disabled={car.status !== "active"}
          onClick={() => {
            setKind("test_drive");
            setError("");
          }}
        >
          <Icon name="calendar_month" />
          Request a test drive
        </button>
        <button
          className="ws-button secondary"
          disabled={car.status !== "active"}
          onClick={() => {
            setKind("question");
            setError("");
          }}
        >
          Ask the seller
        </button>
        <button
          className="ws-icon-button border border-slate-200"
          aria-label={saved ? "Unsave vehicle" : "Save vehicle"}
          aria-pressed={saved}
          disabled={busy}
          onClick={save}
        >
          <Icon name={saved ? "bookmark_added" : "bookmark_add"} />
        </button>
        <button
          className="ws-icon-button border border-slate-200"
          aria-label="Share vehicle"
          onClick={share}
        >
          <Icon name="share" />
        </button>
      </div>
      {(message || error) && (
        <p
          className={`text-xs mt-4 ${error ? "text-red-600" : "text-emerald-700"}`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
      {kind && (
        <Modal
          title={
            kind === "test_drive" ? "Request a test drive" : "Ask the seller"
          }
          onClose={() => {
            if (!busy) setKind(null);
          }}
        >
          <form className="ws-form" onSubmit={submit}>
            {error && <div className="ws-notice error">{error}</div>}
            <div className="ws-form-grid">
              <label className="ws-field full">
                Contact phone
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={20}
                  autoComplete="tel"
                />
              </label>
              {kind === "test_drive" && (
                <label className="ws-field full">
                  Preferred date and time
                  <input name="preferred_at" type="datetime-local" required />
                </label>
              )}
              <label className="ws-field full">
                {kind === "question"
                  ? "Your question"
                  : "Message for the seller"}
                <textarea
                  name="message"
                  rows={4}
                  required={kind === "question"}
                  minLength={kind === "question" ? 5 : undefined}
                />
              </label>
            </div>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                type="button"
                disabled={busy}
                onClick={() => setKind(null)}
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
    </div>
  );
}
