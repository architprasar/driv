"use client";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  Modal,
  Icon,
  money,
  errorMessage,
} from "@/components/workspace/WorkspaceUI";
export type PaymentInfo = {
  refunds?: {
    id: number;
    amount: string;
    status: string;
    reason: string;
    created_at: string;
  }[];
  id: number;
  status: string;
  mode: string;
  amount: string;
  currency: string;
  refunded_amount: string;
};
type CashfreeCheckout = {
  checkout: (o: {
    paymentSessionId: string;
    redirectTarget: "_modal";
  }) => Promise<{ error?: { message?: string }; paymentDetails?: unknown }>;
};
declare global {
  interface Window {
    Cashfree?: (o: { mode: "sandbox" | "production" }) => CashfreeCheckout;
  }
}
const CASHFREE_SDK = "https://sdk.cashfree.com/js/v3/cashfree.js";
function loadCashfree(): Promise<NonNullable<Window["Cashfree"]>> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve(window.Cashfree);
    const tag = document.createElement("script");
    tag.src = CASHFREE_SDK;
    tag.async = true;
    tag.onload = () =>
      window.Cashfree
        ? resolve(window.Cashfree)
        : reject(new Error("Cashfree checkout failed to load."));
    tag.onerror = () =>
      reject(new Error("Could not reach Cashfree. Check your connection."));
    document.head.appendChild(tag);
  });
}
const METHODS = [
  ["account_balance", "UPI"],
  ["credit_card", "Cards"],
  ["account_balance_wallet", "Wallets"],
  ["domain", "Netbanking"],
  ["event_repeat", "EMI"],
] as const;

export default function PaymentActions({
  order,
  onChange,
}: {
  order: {
    id: number;
    status: string;
    total: string;
    currency: string;
    reservation_expires_at?: string | null;
    payment: PaymentInfo | null;
  };
  onChange: () => void;
}) {
  const config = useResource<{
    mode: string;
    available: boolean;
    environment?: string;
  }>("/payments/config/");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testPayment, setTestPayment] = useState<PaymentInfo | null>(null);
  const verified = useRef(false);
  useEffect(() => {
    if (
      verified.current ||
      !order.payment ||
      order.payment.status !== "processing" ||
      new URLSearchParams(window.location.search).get("payment") !== "verify"
    )
      return;
    verified.current = true;
    apiClient
      .post("/payments/confirm/", { payment_id: order.payment.id })
      .then(() => onChange())
      .catch((e) => setError(errorMessage(e)));
  }, [order.payment, onChange]);
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post("/payments/create-intent/", {
        order_id: order.id,
        method: "card",
      });
      if (data.mode === "test") setTestPayment(data.payment);
      else if (data.mode === "cashfree" && data.payment_session_id) {
        const Cashfree = await loadCashfree();
        const cashfree = Cashfree({
          mode:
            config.data?.environment === "production"
              ? "production"
              : "sandbox",
        });
        const result = await cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_modal",
        });
        if (result.error) {
          setError(
            result.error.message || "The payment was not completed. Try again.",
          );
        } else {
          // Never trust the browser result: the server re-checks with Cashfree.
          await apiClient
            .post("/payments/confirm/", { payment_id: data.payment.id })
            .catch((e) => setError(errorMessage(e)));
        }
        onChange();
      } else if (data.checkout_url) window.location.assign(data.checkout_url);
      else
        setError(
          "Checkout could not be opened. Your order is saved; contact support.",
        );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (result: "succeed" | "decline") => {
    if (!testPayment) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.post("/payments/confirm/", {
        payment_id: testPayment.id,
        result,
      });
      setTestPayment(null);
      onChange();
    } catch (e) {
      setTestPayment(null);
      setError(errorMessage(e));
      onChange();
    } finally {
      setBusy(false);
    }
  };
  if (order.status !== "placed") return null;
  return (
    <>
      <div className="ws-panel pay-card">
        <div className="pay-hero">
          <span className="pay-hero-label">Amount due</span>
          <strong className="pay-hero-amount">
            {money(order.total, order.currency)}
          </strong>
          <span className="pay-secure">
            <Icon name="verified_user" /> Secured by{" "}
            {config.data?.mode === "cashfree" ? "Cashfree Payments" : "encrypted checkout"}
          </span>
        </div>
        <div className="ws-form">
          {order.payment?.status === "failed" && (
            <div className="ws-notice error" role="alert">
              The last payment attempt failed or was declined. Your order is
              saved; you can retry.
            </div>
          )}
          {error && (
            <div className="ws-notice error" role="alert">
              {error}
            </div>
          )}
          {config.data?.mode === "test" && (
            <div className="ws-notice">
              <Icon name="science" />
              <p>
                Local test checkout. No money is collected and no card
                information is required.
              </p>
            </div>
          )}
          {config.data?.mode === "cashfree" && (
            <>
              <ul className="pay-methods" aria-label="Accepted payment methods">
                {METHODS.map(([icon, label]) => (
                  <li key={label}>
                    <Icon name={icon} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              {config.data.environment !== "production" && (
                <details className="pay-sandbox">
                  <summary>
                    <Icon name="science" /> Sandbox mode: no real money moves
                  </summary>
                  <p>
                    Typical Cashfree test data: card{" "}
                    <code>4111 1111 1111 1111</code>, any future expiry, CVV{" "}
                    <code>123</code>, OTP <code>111000</code>; UPI{" "}
                    <code>testsuccess@gocash</code>. See Cashfree&apos;s test
                    data docs for failure cases.
                  </p>
                </details>
              )}
            </>
          )}
          {order.reservation_expires_at && (
            <p className="pay-hold">
              <Icon name="schedule" /> Reserved until{" "}
              {new Date(order.reservation_expires_at).toLocaleString("en-IN")}.
              An unpaid reservation expires automatically.
            </p>
          )}
          <button
            className="ws-button w-full pay-cta"
            disabled={busy || config.loading || !config.data?.available}
            onClick={pay}
          >
            <Icon name="lock" />
            {busy
              ? "Opening secure checkout…"
              : config.data?.mode === "test"
                ? "Continue to test payment"
                : `Pay ${money(order.total, order.currency)}`}
          </button>
          {!config.loading && !config.data?.available && (
            <p className="text-xs text-red-600 mt-4">
              Payment checkout is not configured. Your order is saved; contact
              support before its reservation expires.
            </p>
          )}
        </div>
      </div>
      {testPayment && (
        <Modal
          title="Local test payment"
          onClose={() => {
            if (!busy) setTestPayment(null);
          }}
        >
          <div className="ws-form">
            <div className="ws-notice">
              <Icon name="science" />
              <p>
                This simulates a payment outcome. No card is charged and no
                money moves.
              </p>
            </div>
            <p className="text-lg font-bold">
              {money(testPayment.amount, testPayment.currency)}
            </p>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                disabled={busy}
                onClick={() => confirm("decline")}
              >
                Simulate decline
              </button>
              <button
                className="ws-button"
                disabled={busy}
                onClick={() => confirm("succeed")}
              >
                {busy ? "Confirming…" : "Simulate successful payment"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
