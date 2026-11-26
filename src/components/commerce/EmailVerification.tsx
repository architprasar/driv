"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { errorMessage } from "@/components/workspace/WorkspaceUI";
export default function EmailVerification() {
  const params = useSearchParams();
  const token = params.get("token");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function verify() {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post("/auth/email/verify/", { token });
      setMessage(data.detail);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-lg mx-auto px-6 py-24">
      <h1 className="text-3xl font-bold">Verify your email</h1>
      <p className="my-5 text-slate-600">
        Confirm that this email address belongs to you so we can keep you
        updated on your orders and account.
      </p>
      {error && (
        <p role="alert" className="text-red-700 mb-5">
          {error}
        </p>
      )}
      {message ? (
        <p role="status" className="mb-5 text-green-700">
          {message}
        </p>
      ) : token ? (
        <button
          className="bg-blue-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
          disabled={busy}
          onClick={verify}
        >
          {busy ? "Verifying…" : "Confirm email address"}
        </button>
      ) : (
        <p className="mb-5">
          Open the confirmation link from your email, or request another from
          account settings.
        </p>
      )}
      <Link
        href="/profile/settings"
        className="block mt-6 text-blue-700 underline"
      >
        Account settings
      </Link>
    </section>
  );
}
