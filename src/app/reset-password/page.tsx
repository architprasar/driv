"use client";
import { useClientReady } from "@/lib/use-client-ready";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { apiClient } from "@/lib/api-client";

function ResetPasswordForm() {
  const ready = useClientReady();
  const params = useSearchParams();
  const router = useRouter();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await apiClient.post("/auth/password/reset/", {
        uid,
        token,
        password,
        password2: confirmPassword,
      });
      setMessage(data.detail || "Password updated successfully.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { detail?: string; password?: string[] } };
      };
      setError(
        apiError.response?.data?.detail ||
          apiError.response?.data?.password?.[0] ||
          "Password reset failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <main className="mx-auto w-full max-w-xl rounded-3xl border border-outline-variant bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-h3 text-on-surface">Invalid reset link</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          The password reset URL is missing required information.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary">
            Request a new reset link
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl rounded-3xl border border-outline-variant bg-white p-8 shadow-sm sm:p-10">
      <h1 className="text-h2 text-on-surface">Set a new password</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Choose a strong password for your account.
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
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold text-on-surface"
          >
            New password
          </label>
          <input
            disabled={!ready || loading}
            id="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-outline-variant px-3.5 py-3 text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-xs font-semibold text-on-surface"
          >
            Confirm new password
          </label>
          <input
            disabled={!ready || loading}
            id="confirm-password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-outline-variant px-3.5 py-3 text-sm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          disabled={!ready || loading}
          className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-on-primary disabled:opacity-70"
          type="submit"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-surface-container-low py-10">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-xl p-8 text-sm text-on-surface-variant">
            Loading...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
