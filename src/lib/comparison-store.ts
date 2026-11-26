const storageKey = "drivio-buy-comparison";
let fallback = "[]";
export function comparisonSnapshot() {
  try {
    return localStorage.getItem(storageKey) || fallback;
  } catch {
    return fallback;
  }
}
export function subscribeComparison(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("drivio-comparison", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("drivio-comparison", callback);
  };
}
export function saveComparison(items: unknown[]) {
  fallback = JSON.stringify(items);
  let persisted = true;
  try {
    localStorage.setItem(storageKey, fallback);
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event("drivio-comparison"));
  return persisted;
}
