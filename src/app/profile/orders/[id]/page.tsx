import OrderDetails from "@/components/workspace/OrderDetails";
export const metadata = { title: "Order details | DrivioCars" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetails id={id} />;
}
