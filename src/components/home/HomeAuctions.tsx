"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Action, Icon } from "./HomePrimitives";
import { getMediaUrl } from "@/lib/runtime-config";
import type { HomeAuction } from "./types";
function Countdown({ end }: { end?: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!end) return;
    const tick = () =>
      setRemaining(
        Math.max(0, Math.floor((new Date(end).getTime() - Date.now()) / 1000)),
      );
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [end]);
  const values =
    remaining === null
      ? ["—", "—", "—"]
      : [
          Math.floor(remaining / 3600),
          Math.floor(remaining / 60) % 60,
          remaining % 60,
        ].map((v) => String(v).padStart(2, "0"));
  return (
    <div className="auction-countdown" aria-label="Auction time remaining">
      {["HOURS", "MINUTES", "SECONDS"].map((label, i) => (
        <div key={label}>
          <strong>{values[i]}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export function HomeAuctions({
  auctions,
  unavailable,
}: {
  auctions: HomeAuction[];
  unavailable: boolean;
}) {
  const available = auctions.filter((a) =>
    ["live", "upcoming"].includes(a.status),
  );
  const featured = available.find((a) => a.status === "live") || available[0];
  return (
    <section className="home-auctions">
      <div className="home-container">
        <Link className="auction-view-all" href="/auctions">
          View all auctions
          <Icon name="arrow_forward" />
        </Link>
        <div className="auction-layout">
          <div className="auction-intro">
            <h2>
              {featured?.status === "live"
                ? "The auction is live"
                : "Find your next auction"}
            </h2>
            <p>Review the lot details, track bids and follow the result.</p>
            {featured?.status === "live" && (
              <Countdown end={featured.end_time} />
            )}
            <Action
              href={featured ? `/auctions/${featured.id}` : "/auctions"}
              className="auction-enter"
            >
              {featured ? "Open auction" : "Browse auctions"}
            </Action>
            {unavailable && (
              <p className="auction-note" role="status">
                Auction information is temporarily unavailable. Please try
                again.
              </p>
            )}
            {!unavailable && !featured && (
              <p className="auction-note">
                No open lots are currently available.
              </p>
            )}
          </div>
          {featured && (
            <article className="auction-featured">
              <div className="relative min-h-48">
                {featured.car_image ? (
                  <Image
                    src={getMediaUrl(featured.car_image)}
                    alt={featured.car_title || "Auction vehicle"}
                    fill
                    sizes="(max-width:768px) 100vw, 35vw"
                    className="object-cover"
                  />
                ) : (
                  <Icon name="directions_car" />
                )}
                <span className="auction-live">
                  {featured.status === "live" ? "LIVE" : "UPCOMING"}
                </span>
              </div>
              <div className="auction-feature-details">
                <small>Lot {featured.lot_number || featured.id}</small>
                <h3>{featured.car_title}</h3>
                <p>
                  {Number(featured.current_bid) > 0
                    ? "Current bid"
                    : "Starting bid"}
                </p>
                <strong>
                  ₹{" "}
                  {Number(
                    Number(featured.current_bid) > 0
                      ? featured.current_bid
                      : featured.starting_bid || 0,
                  ).toLocaleString("en-IN")}
                </strong>
                <Action href={`/auctions/${featured.id}`}>View lot</Action>
              </div>
            </article>
          )}
          {available
            .filter((a) => a.id !== featured?.id)
            .slice(0, 2)
            .map((a) => (
              <Link
                key={a.id}
                href={`/auctions/${a.id}`}
                className="auction-upcoming"
              >
                <div className="relative min-h-32">
                  {a.car_image ? (
                    <Image
                      src={getMediaUrl(a.car_image)}
                      alt={a.car_title || "Auction vehicle"}
                      fill
                      sizes="250px"
                      className="object-cover"
                    />
                  ) : (
                    <Icon name="directions_car" />
                  )}
                </div>
                <span className="uppercase">{a.status}</span>
                <div>
                  <h3>{a.car_title}</h3>
                  <p>Lot {a.lot_number || a.id}</p>
                  <small>
                    View auction
                    <Icon name="arrow_forward" />
                  </small>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
