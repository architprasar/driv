import Link from "next/link";
import { notFound } from "next/navigation";
import CmsBody from "@/components/CmsBody";
import { getCmsPage } from "@/lib/cms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = await getCmsPage((await params).slug);
  return { title: page ? `${page.title} | DrivioCars` : "DrivioCars" };
}

export default async function CmsContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = await getCmsPage((await params).slug);
  if (!page) notFound();
  return (
    <article className="max-w-3xl mx-auto px-6 py-14">
      <Link href="/help" className="text-blue-700 underline">
        Help centre
      </Link>
      <h1 className="text-3xl font-bold mt-5">{page.title}</h1>
      {page.intro && <p className="text-lg text-slate-600 mt-3">{page.intro}</p>}
      <div className="mt-8 text-slate-600 leading-7">
        <CmsBody blocks={page.body} />
      </div>
    </article>
  );
}
