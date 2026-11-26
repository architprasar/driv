export type AppAlertPayload = {
  message: string;
  variant?: "success" | "error" | "info";
  durationMs?: number;
};

const APP_ALERT_EVENT = "drivio:app-alert";

export function showAppAlert(payload: AppAlertPayload | string) {
  if (typeof window === "undefined") return;
  const detail = typeof payload === "string" ? { message: payload } : payload;
  window.dispatchEvent(new CustomEvent(APP_ALERT_EVENT, { detail }));
}

export function getAppAlertEventName() {
  return APP_ALERT_EVENT;
}
