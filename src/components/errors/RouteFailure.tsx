"use client";
import Link from "next/link";

export default function RouteFailure({
  reset,
  reference,
}: {
  reset: () => void;
  reference?: string;
}) {
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center" role="alert">
      <span
        className="material-symbols-outlined text-4xl text-blue-600"
        aria-hidden="true"
      >
        cloud_off
      </span>
      <h1 className="mt-5 text-3xl font-bold">We couldn’t load this page</h1>
      <p className="mt-4 text-slate-600">
        Please try again. If you were checking out, review your orders before
        starting another purchase.
      </p>
      {reference && (
        <p className="mt-3 text-xs text-slate-500">
          Support reference: {reference}
        </p>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          onClick={reset}
        >
          Try again
        </button>
        <Link className="rounded-lg border px-5 py-3" href="/profile/orders">
          View my orders
        </Link>
        <Link className="rounded-lg border px-5 py-3" href="/help">
          Get help
        </Link>
      </div>
    </section>
  );
}
