import { Suspense } from "react";
import Checkout from "@/components/commerce/Checkout";
export const metadata = { title: "Checkout | DrivioCars" };
export default function Page() {
  return (
    <Suspense fallback={<p>Loading checkout…</p>}>
      <Checkout />
    </Suspense>
  );
}
