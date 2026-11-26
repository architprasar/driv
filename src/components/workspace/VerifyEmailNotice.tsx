"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { errorMessage } from "./WorkspaceUI";
export default function VerifyEmailNotice() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function send() {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post("/auth/email/send-verification/");
      setMessage(data.detail);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ws-notice mb-6">
      <div>
        <strong>Confirm your email address</strong>
        <p className="mt-1 text-sm">
          Use the link in your email to verify your contact address.
        </p>
        {message && (
          <p role="status" className="mt-2 text-sm">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm">
            {error}
          </p>
        )}
        <button
          className="ws-text-link mt-3"
          disabled={busy || !!message}
          onClick={send}
        >
          {busy ? "Sending…" : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}
