"use client";
import { useClientReady } from "@/lib/use-client-ready";

import Image from "next/image";
import Link from "next/link";
import AuthSwitchLink from "@/components/commerce/AuthSwitchLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeDestination } from "@/lib/auth-session";
import { apiClient } from "@/lib/api-client";

export default function RegisterPage() {
  const ready = useClientReady();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiClient.post("/auth/register/", {
        email,
        full_name: name.trim(),
        password,
        password2: confirmPassword,
        role: "buyer",
      });
      router.push(
        safeDestination(
          new URLSearchParams(window.location.search).get("next"),
        ),
      );
      router.refresh();
    } catch (err: unknown) {
      const apiError = err as {
        response?: {
          data?: { detail?: string; email?: string[]; password?: string[] };
        };
      };
      setError(
        apiError.response?.data?.detail ||
          apiError.response?.data?.email?.[0] ||
          apiError.response?.data?.password?.[0] ||
          "Could not create your account right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background">
      <section className="relative w-full min-h-[62vh] flex items-center overflow-hidden bg-dark">
        <Image
          alt="Premium car showroom"
          className="object-cover object-center"
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1920&auto=format&fit=crop"
          fill
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/95 via-dark/80 to-dark/45" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/"
            className="text-3xl sm:text-4xl font-black tracking-tight text-white"
          >
            DRIVIOCARS
          </Link>
          <div className="max-w-2xl mt-6">
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-white px-4 py-2 rounded-full mb-5">
              <span
                className="material-symbols-outlined text-primary-fixed-dim"
                style={{ fontSize: "14px" }}
              >
                directions_car
              </span>
              <span className="label-caps text-primary-fixed-dim">
                Car Marketplace Account
              </span>
            </div>
            <h1 className="text-display text-white mb-4">
              Create Your Account.
            </h1>
            <p className="text-lg text-dark-muted leading-relaxed">
              Save your dream cars, compare deals, and checkout faster with
              verified sellers.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-6">
          <div className="bg-white rounded-3xl border border-outline-variant p-6 sm:p-8 lg:p-10 shadow-sm">
            <p className="label-caps text-primary">New Account</p>
            <h2 className="text-h2 text-on-surface mt-2">Join DrivioCars</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              It takes less than a minute.
            </p>
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
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-semibold text-on-surface"
                >
                  Full name
                </label>
                <input
                  disabled={!ready || loading}
                  id="name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3.5 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                  className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3.5 text-sm"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-on-surface"
                >
                  Password
                </label>
                <input
                  disabled={!ready || loading}
                  id="password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3.5 text-sm"
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
                  Confirm password
                </label>
                <input
                  disabled={!ready || loading}
                  id="confirm-password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3.5 text-sm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-slate-600">
                By creating an account, you agree to the{" "}
                <Link href="/policies/terms" className="underline">
                  marketplace terms
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/policies/privacy" className="underline">
                  privacy information
                </Link>
                .
              </p>
              <button
                disabled={!ready || loading}
                className="w-full rounded-xl bg-primary px-4 py-4 text-sm font-bold text-on-primary shadow-md shadow-primary/20 hover:bg-primary-hover disabled:opacity-70"
                type="submit"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
            <p className="mt-6 text-sm text-on-surface-variant">
              Already registered?{" "}
              <AuthSwitchLink href="/login">Sign in</AuthSwitchLink>
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: "50K+", label: "Listings" },
                { value: "Orders", label: "Track purchases" },
                { value: "Messages", label: "Ask sellers" },
                { value: "Returns", label: "Follow requests" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-center"
                >
                  <p className="text-lg font-black text-on-surface">
                    {item.value}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {[
                "Seller enquiries",
                "Saved orders",
                "Available inspection records",
                "Auction updates",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-semibold text-on-surface-variant"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-assured-container p-5 border border-assured-border">
              <p className="label-caps text-assured mb-2">Buyer Protection</p>
              <p className="text-sm text-on-assured-container">
                Review each listing’s evidence and keep your order reference.
                Follow fulfilment, return requests and support replies in your
                account.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
