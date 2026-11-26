import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import WorkspaceShell from "./WorkspaceShell";

export default async function WorkspaceLayout({
  children,
  mode = "account",
}: {
  children: React.ReactNode;
  mode?: "account" | "seller" | "vendor";
}) {
  const store = await cookies();
  if (!store.has("access_token") && !store.has("refresh_token"))
    redirect(
      `/login?next=${encodeURIComponent(mode === "vendor" ? "/vendor/dashboard" : mode === "seller" ? "/dashboard" : "/profile")}`,
    );
  return <WorkspaceShell mode={mode}>{children}</WorkspaceShell>;
}
