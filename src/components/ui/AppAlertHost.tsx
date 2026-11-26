"use client";

import { useEffect, useState } from "react";
import { getAppAlertEventName, type AppAlertPayload } from "@/lib/app-alert";

type AlertState = Required<Pick<AppAlertPayload, "message">> & {
  variant: "success" | "error" | "info";
};

export default function AppAlertHost() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  useEffect(() => {
    const eventName = getAppAlertEventName();
    let timeout: number | undefined;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AppAlertPayload>;
      const payload = customEvent.detail;
      if (!payload?.message) return;
      setAlert({ message: payload.message, variant: payload.variant || "info" });
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setAlert(null), payload.durationMs ?? 2600);
    };

    window.addEventListener(eventName, handler as EventListener);
    return () => {
      window.removeEventListener(eventName, handler as EventListener);
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  if (!alert) return null;

  const tone =
    alert.variant === "success"
      ? "bg-assured text-on-assured shadow-assured/30"
      : alert.variant === "error"
        ? "bg-error text-on-error shadow-error/30"
        : "bg-on-surface text-white shadow-black/30";

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-md pointer-events-none">
      <div className={`rounded-xl px-4 py-3 text-sm font-bold shadow-xl ${tone}`}>
        {alert.message}
      </div>
    </div>
  );
}
