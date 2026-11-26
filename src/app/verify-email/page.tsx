import { Suspense } from "react";
import EmailVerification from "@/components/commerce/EmailVerification";
export const metadata = {
  title: "Verify email | DrivioCars",
  referrer: "no-referrer" as const,
};
export default function Page() {
  return (
    <Suspense fallback={<p className="p-10">Loading verification…</p>}>
      <EmailVerification />
    </Suspense>
  );
}
