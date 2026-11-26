import SellerSale from "@/components/commerce/SellerSale";
export const metadata = { title: "Fulfil sale | DrivioCars" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerSale id={id} />;
}
