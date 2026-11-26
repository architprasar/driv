import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ car?: string }>;
}) {
  const { car } = await searchParams;
  redirect(car ? `/checkout?car=${encodeURIComponent(car)}` : "/checkout");
}
