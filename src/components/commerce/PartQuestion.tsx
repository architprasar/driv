"use client";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import { Modal, errorMessage } from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";
export default function PartQuestion({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.post("/parts/questions/", {
        part: id,
        phone: form.get("phone"),
        message: form.get("message"),
      });
      setOpen(false);
      setMessage(
        "Question sent. The seller’s reply will appear in your account enquiries.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="commerce mt-5">
      <button
        className="ws-button secondary"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        Ask about fitment or this part
      </button>
      {message && (
        <p className="text-xs text-emerald-700 mt-3" role="status">
          {message}
        </p>
      )}
      {open && (
        <Modal
          title="Ask the seller"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form className="ws-form" onSubmit={submit}>
            {error && (
              <div className="ws-notice error" role="alert">
                {error}
              </div>
            )}
            <div className="ws-form-grid">
              <label className="ws-field full">
                Contact phone
                <input type="tel" name="phone" required maxLength={20} />
              </label>
              <label className="ws-field full">
                Your question
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={3000}
                  rows={5}
                />
              </label>
            </div>
            <div className="ws-form-actions">
              <button
                type="button"
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Back
              </button>
              <button className="ws-button" disabled={busy}>
                {busy ? "Sending…" : "Send question"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
