import Link from "next/link";
export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-semibold text-blue-600">Page not found</p>
      <h1 className="mt-4 text-3xl font-bold">
        This page or listing isn’t available
      </h1>
      <p className="mt-4 text-slate-600">
        The link may have changed, or the listing may have been removed. Your
        existing orders remain in your account.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          className="rounded-lg bg-blue-600 px-5 py-3 text-white"
          href="/cars"
        >
          Browse cars
        </Link>
        <Link className="rounded-lg border px-5 py-3" href="/parts">
          Browse parts
        </Link>
        <Link className="rounded-lg border px-5 py-3" href="/profile/orders">
          My orders
        </Link>
      </div>
    </section>
  );
}
