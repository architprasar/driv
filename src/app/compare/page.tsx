import { Suspense } from "react";
import Compare from "@/components/commerce/Compare";
export const metadata = { title: "Compare vehicles | DrivioCars" };
export default function Page() {
  return (
    <Suspense fallback={<p>Loading comparison…</p>}>
      <Compare />
    </Suspense>
  );
}
