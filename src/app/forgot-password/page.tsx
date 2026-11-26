"use client";
import { useClientReady } from "@/lib/use-client-ready";

import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const ready = useClientReady();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await apiClient.post("/auth/password/forgot/", {
        email,
      });
      setMessage(
        data.detail || "If an account exists, we sent a password reset link.",
      );
    } catch {
      setError("Unable to process request right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low py-10">
      <main className="mx-auto w-full max-w-xl rounded-3xl border border-outline-variant bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-h2 text-on-surface">Forgot your password?</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Enter your email and we will send a reset link.
        </p>

        {message && (
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
            {message}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-error/25 bg-error/10 p-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold text-on-surface"
            >
              Email
            </label>
            <input
              disabled={!ready || loading}
              id="email"
              autoComplete="email"
              className="w-full rounded-xl border border-outline-variant px-3.5 py-3 text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            disabled={!ready || loading}
            className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-on-primary disabled:opacity-70"
            type="submit"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-5 text-sm text-on-surface-variant">
          Back to{" "}
          <Link href="/login" className="font-semibold text-primary">
            login
          </Link>
        </p>
      </main>
    </div>
  );
}
