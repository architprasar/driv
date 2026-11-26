export const metadata = { title: "Vehicle inventory | DrivioCars" };
import { Suspense } from "react";
import Inventory from "@/components/workspace/Inventory";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading inventory…</p>}>
      <Inventory type="cars" />
    </Suspense>
  );
}
