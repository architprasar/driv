"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getMediaUrl, getWsBaseUrl } from "@/lib/runtime-config";
import {
  PageHeader,
  Panel,
  Badge,
  Icon,
  money,
  errorMessage,
} from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";
type Bid = {
  id: number;
  bidder_name: string;
  amount: string;
  is_proxy: boolean;
  created_at: string;
};
type Auction = {
  id: number;
  lot_number: string;
  car_title: string;
  car_image: string | null;
  current_bid: string;
  starting_bid: string;
  min_increment: string;
  status: string;
  start_time: string;
  end_time: string;
  reserve_met: boolean;
  bid_count: number;
  bids: Bid[];
  winning_order_id: number | null;
  is_watching: boolean;
  damage_type: string;
  damage_severity: string;
  estimated_repair_cost: string;
  car_summary: Record<string, string | number>;
};
export default function LiveAuctionClient({
  initialAuction,
}: {
  initialAuction: Auction;
}) {
  const [auction, setAuction] = useState(initialAuction);
  const [amount, setAmount] = useState("");
  const [proxy, setProxy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState("");
  const [clock, setClock] = useState(0);
  const [connected, setConnected] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const { data } = await apiClient.get<Auction>(
        `/auctions/${initialAuction.id}/`,
      );
      if (request === sequence.current) {
        setAuction(data);
        setLoadError("");
      }
    } catch (e) {
      if (request === sequence.current) setLoadError(errorMessage(e));
    }
  }, [initialAuction.id]);
  useEffect(() => {
    const update = () => {
      setClock(Date.now());
      const remaining =
        new Date(
          auction.status === "upcoming" ? auction.start_time : auction.end_time,
        ).getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown(auction.status === "upcoming" ? "Opening…" : "Closing…");
        return;
      }
      const seconds = Math.floor(remaining / 1000);
      const hours = Math.floor(seconds / 3600);
      setCountdown(
        `${hours}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`,
      );
    };
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [auction.end_time, auction.start_time, auction.status]);
  useEffect(() => {
    let socket: WebSocket | null = null;
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 5000);
    try {
      socket = new WebSocket(
        `${getWsBaseUrl()}/ws/auctions/${initialAuction.id}/`,
      );
      socket.onopen = () => setConnected(true);
      socket.onclose = () => setConnected(false);
      socket.onmessage = () => refresh();
    } catch {
      /* Polling remains available. */
    }
    const visible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      socket?.close();
      sequence.current++;
    };
  }, [initialAuction.id, refresh]);
  const place = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiClient.post(
        `/auctions/${auction.id}/${proxy ? "proxy-bid" : "place_bid"}/`,
        proxy ? { proxy_max: amount } : { amount },
      );
      setAmount("");
      setMessage(
        proxy
          ? "Your proxy limit was registered. The visible price only increases when competing bids require it."
          : "Bid accepted.",
      );
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const watch = async () => {
    setBusy(true);
    setError("");
    try {
      await apiClient.post(`/auctions/${auction.id}/watch/`);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const minimum = Math.max(
    Number(auction.starting_bid),
    Number(auction.current_bid) + Number(auction.min_increment),
  );
  const live =
    auction.status === "live" && new Date(auction.end_time).getTime() > clock;
  return (
    <div className="commerce max-w-7xl mx-auto px-5 py-10">
      <Link href="/auctions" className="ws-text-link mb-5">
        <Icon name="arrow_back" />
        All auctions
      </Link>
      <PageHeader
        title={auction.car_title}
        description={`Lot ${auction.lot_number}. ${connected ? "Live updates connected." : "Updates refresh automatically."}`}
        action={<Badge value={auction.status} />}
      />
      {(error || loadError) && (
        <div className="ws-notice error" role="alert">
          {error || loadError}
        </div>
      )}
      {message && (
        <div className="ws-notice success" role="status">
          {message}
        </div>
      )}
      <div className="ws-grid">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100 mb-6">
            {auction.car_image ? (
              <Image
                src={getMediaUrl(auction.car_image)}
                alt={auction.car_title}
                fill
                sizes="(max-width:900px) 100vw, 65vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full grid place-items-center text-slate-400">
                <Icon name="directions_car" />
              </div>
            )}
          </div>
          <Panel title="Vehicle and damage details">
            <dl className="ws-detail-list">
              {Object.entries(auction.car_summary || {})
                .filter(([, value]) => value !== null && value !== "")
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="capitalize">{key.replace(/_/g, " ")}</dt>
                    <dd className="capitalize">{value}</dd>
                  </div>
                ))}
              <div>
                <dt>Damage</dt>
                <dd className="capitalize">
                  {auction.damage_type} / {auction.damage_severity}
                </dd>
              </div>
              <div>
                <dt>Seller repair estimate</dt>
                <dd>{money(auction.estimated_repair_cost)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title={`Recent bids (${auction.bid_count} total)`}>
            {auction.bids.length ? (
              <div className="ws-table-scroll">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Bidder</th>
                      <th>Amount</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auction.bids.map((bid) => (
                      <tr key={bid.id}>
                        <td>
                          <strong>{bid.bidder_name}</strong>
                          {bid.is_proxy && (
                            <p className="text-[10px]">Automatic / proxy bid</p>
                          )}
                        </td>
                        <td className="ws-number">{money(bid.amount)}</td>
                        <td>
                          {new Date(bid.created_at).toLocaleTimeString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ws-panel-body text-sm text-slate-500">
                No bids have been placed yet.
              </p>
            )}
          </Panel>
        </div>
        <div>
          <Panel
            title={
              auction.status === "upcoming"
                ? "Bidding opens soon"
                : live
                  ? "Place your bid"
                  : "Auction result"
            }
          >
            <div className="ws-form">
              <p className="text-xs text-slate-500">
                {Number(auction.current_bid) > 0
                  ? "Current bid"
                  : "Starting bid"}
              </p>
              <p className="text-4xl font-bold mt-2 mb-3">
                {money(
                  Number(auction.current_bid) > 0
                    ? auction.current_bid
                    : auction.starting_bid,
                )}
              </p>
              <p className="text-xs text-slate-500 mb-5">
                {live
                  ? "Ends in"
                  : auction.status === "upcoming"
                    ? "Opens in"
                    : "Closed"}{" "}
                {live || auction.status === "upcoming" ? countdown : ""}
              </p>
              <Badge
                value={auction.reserve_met ? "reserve_met" : "reserve_not_met"}
              />
              {live ? (
                <div className="mt-6">
                  <label className="ws-check mb-4">
                    <input
                      type="checkbox"
                      checked={proxy}
                      onChange={(e) => setProxy(e.target.checked)}
                    />
                    Use a private maximum bid
                  </label>
                  <label className="ws-field">
                    {proxy ? "Maximum bid (INR)" : "Your bid (INR)"}
                    <input
                      type="number"
                      step="0.01"
                      min={minimum}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`At least ${minimum}`}
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-3 mb-5">
                    Minimum next bid: {money(minimum)}. Increment:{" "}
                    {money(auction.min_increment)}.
                  </p>
                  <button
                    className="ws-button w-full"
                    disabled={
                      busy || !!loadError || !amount || Number(amount) < minimum
                    }
                    onClick={place}
                  >
                    {busy
                      ? "Submitting…"
                      : proxy
                        ? "Register proxy limit"
                        : "Place bid"}
                  </button>
                  <p className="text-xs text-slate-500 mt-4">
                    Verify your email in Account settings before bidding. If you
                    win and the reserve is met, your payable order will appear
                    in your account. Complete checkout before the winner’s
                    payment window expires.
                  </p>
                </div>
              ) : auction.winning_order_id ? (
                <Link
                  className="ws-button w-full mt-6"
                  href={`/profile/orders/${auction.winning_order_id}`}
                >
                  Open winner checkout
                  <Icon name="arrow_forward" />
                </Link>
              ) : (
                <p className="text-sm text-slate-500 mt-5">
                  {auction.status === "upcoming"
                    ? `Bidding starts ${new Date(auction.start_time).toLocaleString("en-IN")}.`
                    : auction.status === "ended"
                      ? "This lot ended without a completed winning sale. Follow the seller’s future listings."
                      : "This lot has a declared winner."}
                </p>
              )}
              <button
                className="ws-button secondary w-full mt-5"
                disabled={busy}
                onClick={watch}
              >
                <Icon
                  name={
                    auction.is_watching
                      ? "notifications_active"
                      : "notifications"
                  }
                />
                {auction.is_watching ? "Stop watching" : "Watch auction"}
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
