"use client";
import { useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  PageHeader,
  Panel,
  LoadState,
  Empty,
  Pager,
  Badge,
  Metric,
  Icon,
  useResource,
  money,
  date,
  errorMessage,
  type PageData,
} from "@/components/workspace/WorkspaceUI";
type Earnings = {
  balances: { currency: string; status: string; amount: string }[];
  account: {
    mode: string;
    connected: boolean;
    requires_live_setup: boolean;
  } | null;
  vendor_verified: boolean;
};
type Payout = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  transfer_reference: string;
  mode: string;
  request_key: string | null;
  initiated_at: string;
};
export default function Payouts() {
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestKey = useRef("");
  const earnings = useResource<Earnings>("/vendors/earnings/");
  const payouts = useResource<PageData<Payout>>(
    `/dashboard/workspace/payouts/?page=${page}`,
  );
  const currency = chosen || earnings.data?.balances[0]?.currency || "INR";
  const total = (status: string) =>
    earnings.data?.balances
      .filter((b) => b.currency === currency && b.status === status)
      .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post("/vendors/connect/");
      if (data.url) window.location.assign(data.url);
      else {
        setMessage(
          "Local test settlement account enabled. No real bank account is connected.",
        );
        earnings.reload();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const transfer = async (key?: string, code = currency) => {
    setBusy(true);
    setError("");
    setMessage("");
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    try {
      const { data } = await apiClient.post("/vendors/request-payout/", {
        request_key: key || requestKey.current,
        currency: code,
      });
      setMessage(
        data.mode === "test"
          ? "Local test settlement completed. No real money moved."
          : "Settlement transferred to your connected account. Bank payout timing is managed by the payment provider.",
      );
      requestKey.current = "";
      earnings.reload();
      payouts.reload();
    } catch (e) {
      setError(errorMessage(e));
      earnings.reload();
      payouts.reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Earnings & settlements"
        description="Follow verified sales from customer receipt to an eligible settlement."
        action={
          <button
            className="ws-button secondary"
            onClick={connect}
            disabled={busy || earnings.loading}
          >
            <Icon name="account_balance" />
            {earnings.data?.account?.connected
              ? "Update settlement account"
              : "Connect settlement account"}
          </button>
        }
      />
      {(message || error) && (
        <div
          className={`ws-notice ${error ? "error" : "success"}`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}
      {earnings.loading || earnings.error ? (
        <LoadState
          loading={earnings.loading}
          error={earnings.error}
          retry={earnings.reload}
        />
      ) : (
        <>
          {earnings.data?.account?.mode === "test" && (
            <div className="ws-notice">
              <Icon name="science" />
              <p>
                Local test settlements only. These records do not represent bank
                transfers.
              </p>
            </div>
          )}
          {!earnings.data?.vendor_verified && (
            <div className="ws-notice">
              Business verification is required before requesting settlements.
              Complete your business details and documents.
            </div>
          )}
          <div className="ws-toolbar mb-5 bg-white rounded-lg border border-slate-200">
            <label htmlFor="earnings-currency" className="text-xs">
              Currency
            </label>
            <select
              id="earnings-currency"
              value={currency}
              onChange={(e) => setChosen(e.target.value)}
            >
              {[
                ...new Set([
                  currency,
                  ...earnings.data!.balances.map((b) => b.currency),
                ]),
              ].map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="ws-metrics">
            <Metric
              title="Pending eligibility"
              value={money(total("pending"), currency)}
              note="Awaiting receipt / return window"
              icon="schedule"
            />
            <Metric
              title="Available"
              value={money(total("available"), currency)}
              note="Eligible for settlement"
              icon="account_balance_wallet"
            />
            <Metric
              title="Transfer processing"
              value={money(total("processing"), currency)}
              note="A saved settlement request"
              icon="sync"
            />
            <Metric
              title="Transferred"
              value={money(total("paid"), currency)}
              note="To your connected account"
              icon="check_circle"
            />
          </div>
          <div className="flex justify-end mb-6">
            <button
              className="ws-button"
              disabled={
                busy ||
                !earnings.data?.vendor_verified ||
                !earnings.data?.account?.connected ||
                total("available") <= 0
              }
              onClick={() => transfer()}
            >
              {busy
                ? "Processing…"
                : `Request ${money(total("available"), currency)} settlement`}
            </button>
          </div>
        </>
      )}
      <Panel title="Settlement history">
        {payouts.loading || payouts.error ? (
          <LoadState
            loading={payouts.loading}
            error={payouts.error}
            retry={payouts.reload}
          />
        ) : !payouts.data?.results.length ? (
          <Empty
            icon="account_balance"
            title="No settlement transfers yet"
            text="Paid sales become eligible after the customer confirms receipt and the return-request window ends."
          />
        ) : (
          <div className="ws-table-scroll">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Transfer</th>
                </tr>
              </thead>
              <tbody>
                {payouts.data.results.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>Settlement #{row.id}</strong>
                      <p className="text-[10px] mt-1">
                        {row.mode === "test"
                          ? "Local test"
                          : "Connected account"}
                      </p>
                    </td>
                    <td className="ws-number">
                      {money(row.amount, row.currency)}
                    </td>
                    <td>
                      <Badge value={row.status} />
                    </td>
                    <td>{date(row.initiated_at)}</td>
                    <td>
                      {row.transfer_reference || "Not transferred"}
                      {row.status === "pending" && row.request_key && (
                        <button
                          className="ws-text-link ml-3"
                          disabled={busy}
                          onClick={() =>
                            transfer(row.request_key!, row.currency)
                          }
                        >
                          Retry saved transfer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payouts.data && !payouts.loading && !payouts.error && (
          <Pager count={payouts.data.count} page={page} setPage={setPage} />
        )}
      </Panel>
    </>
  );
}
