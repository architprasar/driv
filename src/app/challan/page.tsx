import Link from "next/link";
export const metadata = { title: "Challan information | DrivioCars" };
export default function ChallanPage() {
  return (
    <section className="max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold">Check vehicle challans</h1>
      <p className="mt-6 text-slate-600">
        DrivioCars does not retrieve government challan records or collect
        challan payments. Check current records directly on the official
        government portal.
      </p>
      <a
        className="inline-block mt-7 bg-blue-600 text-white px-5 py-3 rounded-lg"
        href="https://echallan.parivahan.gov.in/index/accused-challan"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open the official eChallan portal
      </a>
      <p className="text-sm mt-5 text-slate-600">
        You will leave DrivioCars. Follow the government portal’s instructions
        and check the website address before entering details.
      </p>
      <Link href="/help" className="block mt-7 text-blue-700 underline">
        Marketplace help
      </Link>
    </section>
  );
}
