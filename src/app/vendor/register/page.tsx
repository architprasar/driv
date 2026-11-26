import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const store = await cookies();
  const destination = "/profile/vendor-registration";
  redirect(store.has("access_token") || store.has("refresh_token") ? destination : `/login?next=${encodeURIComponent(destination)}`);
}
