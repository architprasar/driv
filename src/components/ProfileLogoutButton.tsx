"use client";

import {signOut} from "@/lib/auth-session";
import { useRouter } from "next/navigation";

export default function ProfileLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try { await signOut(); } catch { /* The session proxy clears cookies even when the API is unavailable. */ }
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors"
    >
      <span className="material-symbols-outlined text-[18px]">logout</span>
      Logout
    </button>
  );
}
