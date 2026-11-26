import ListingEditor from "@/components/workspace/ListingEditor";
export const metadata = { title: "Edit listing | DrivioCars" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingEditor id={id} type="parts" base="/dashboard/parts" />;
}
