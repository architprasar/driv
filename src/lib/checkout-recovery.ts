export function checkoutStorageKey(car: string | null) {
  return `drivio:checkout:${car ? `car-${car}` : "cart"}`;
}
export function checkoutAttempt(car: string | null) {
  if (typeof window !== "undefined") {
    try {
      const value = sessionStorage.getItem(checkoutStorageKey(car));
      if (value && /^[a-zA-Z0-9-]{1,80}$/.test(value)) return value;
    } catch {
      /* Checkout works when browser storage is unavailable. */
    }
  }
  return crypto.randomUUID();
}
export function rememberCheckout(car: string | null, key: string) {
  try {
    sessionStorage.setItem(checkoutStorageKey(car), key);
  } catch {}
}
export function forgetCheckout(car: string | null) {
  try {
    sessionStorage.removeItem(checkoutStorageKey(car));
  } catch {}
}
