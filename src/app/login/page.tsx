"use client";
import { useClientReady } from "@/lib/use-client-ready";

import Image from "next/image";
import Link from "next/link";
import AuthSwitchLink from "@/components/commerce/AuthSwitchLink";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeDestination } from "@/lib/auth-session";
import { errorMessage } from "@/components/workspace/WorkspaceUI";
import { apiClient } from "@/lib/api-client";

export default function LoginPage() {
  const ready = useClientReady();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiClient.post("/auth/login/", { email, password });
      router.push(
        safeDestination(
          new URLSearchParams(window.location.search).get("next"),
        ),
      );
      router.refresh();
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background">
      <section className="relative w-full min-h-[62vh] flex items-center overflow-hidden bg-dark">
        <Image
          alt="Premium car on road"
          className="object-cover object-center"
          src="/home/hero-showroom-v2.png"
          fill
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark/95 via-dark/80 to-dark/40" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/"
            className="text-3xl sm:text-4xl font-black tracking-tight text-white"
          >
            DRIVIOCARS
          </Link>
          <div className="max-w-2xl mt-6">
            <div className="inline-flex items-center gap-2 bg-assured/20 border border-assured/30 text-white px-4 py-2 rounded-full mb-5">
              <span
                className="material-symbols-outlined text-assured"
                style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              <span className="label-caps text-assured">
                Your automotive marketplace
              </span>
            </div>
            <h1 className="text-display text-white mb-4">
              Sign In To Your Garage.
            </h1>
            <p className="text-lg text-dark-muted leading-relaxed">
              Manage saved cars, auctions, orders, and offers in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-6">
          <div className="bg-white rounded-3xl border border-outline-variant p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                "Saved vehicles",
                "Order tracking",
                "Seller enquiries",
                "Auction updates",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-xs font-semibold text-on-surface-variant"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-primary-container text-on-primary-container p-5">
              <p className="label-caps text-primary-fixed mb-2">
                Fast Checkout
              </p>
              <p className="text-sm">
                Pick a car, verify history, and move to booking in minutes with
                your saved profile.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant p-6 sm:p-8 lg:p-10 shadow-sm">
            <p className="label-caps text-primary">Account Login</p>
            <h2 className="text-h2 text-on-surface mt-2">Welcome Back</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Sign in to continue.
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
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-on-surface"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    disabled={!ready || loading}
                    id="password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3.5 pr-11 text-sm"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
              <button
                disabled={!ready || loading}
                className="w-full rounded-xl bg-primary px-4 py-4 text-sm font-bold text-on-primary shadow-md shadow-primary/20 hover:bg-primary-hover disabled:opacity-70"
                type="submit"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <p className="mt-6 text-sm text-on-surface-variant">
              New user?{" "}
              <AuthSwitchLink href="/register">Create account</AuthSwitchLink>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
