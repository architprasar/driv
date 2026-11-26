"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMediaUrl } from "@/lib/runtime-config";
import {
  useResource,
  PageHeader,
  LoadState,
  Empty,
  Pager,
  Badge,
  Metric,
  Icon,
  money,
  date,
  type PageData,
} from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";
type Lot = {
  id: number;
  lot_number: string;
  car_title: string;
  car_image: string | null;
  current_bid: string;
  starting_bid: string;
  status: string;
  damage_type: string;
  damage_severity: string;
  end_time: string;
  start_time: string;
  bid_count: number;
  car_location: string;
};
export default function AuctionCatalogue({
  initialStatus = "",
}: {
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [damage, setDamage] = useState("");
  const [sort, setSort] = useState("Bid Ends Soon");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setCity(location);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, location]);
  const { data, error, loading, reload } = useResource<PageData<Lot>>(
    `/auctions/?${new URLSearchParams({ status, search: query, location: city, damage, sort, page: String(page) })}`,
  );
  const counts = useResource<Record<string, number>>("/auctions/summary/");
  return (
    <div className="commerce max-w-7xl mx-auto px-5 py-10">
      <PageHeader
        title="Vehicle auctions"
        description="Explore current lots, inspect the details, and follow your bids through checkout."
        action={
          <Link href="/dashboard/auctions" className="ws-button secondary">
            Manage my auctions
          </Link>
        }
      />
      <div className="ws-metrics">
        {[
          ["Live lots", "live", "gavel"],
          ["Upcoming", "upcoming", "schedule"],
          ["Winner declared", "sold", "verified"],
          ["Ended", "ended", "history"],
        ].map(([title, state, icon]) => (
          <Metric
            key={state}
            title={title}
            value={counts.data?.[state] || 0}
            note="Across the auction catalogue"
            icon={icon}
          />
        ))}
      </div>
      <section className="ws-panel">
        <div className="ws-toolbar">
          <label className="ws-search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, model, or lot"
              aria-label="Search auctions"
            />
          </label>
          <input
            className="rounded-md border border-slate-200 p-2 text-xs"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or location"
            aria-label="Auction location"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Auction status"
          >
            <option value="">All statuses</option>
            {["upcoming", "live", "ended", "sold"].map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={damage}
            onChange={(e) => {
              setDamage(e.target.value);
              setPage(1);
            }}
            aria-label="Damage type"
          >
            <option value="">All damage types</option>
            {[
              "front",
              "rear",
              "side",
              "rollover",
              "flood",
              "fire",
              "hail",
              "mechanical",
              "none",
            ].map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort auctions"
          >
            {[
              "Bid Ends Soon",
              "Newest Listed",
              "Highest Bid",
              "Lowest Bid",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            title="No matching auction lots"
            text="Try another status, city, or damage filter."
            icon="gavel"
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
            {data.results.map((lot) => (
              <article
                className="rounded-xl overflow-hidden border border-slate-200 bg-white"
                key={lot.id}
              >
                <Link
                  href={`/auctions/${lot.id}`}
                  className="block relative aspect-video bg-slate-100"
                >
                  {lot.car_image ? (
                    <Image
                      src={getMediaUrl(lot.car_image)}
                      alt={lot.car_title}
                      fill
                      sizes="(max-width:768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-400">
                      <Icon name="directions_car" />
                    </div>
                  )}
                </Link>
                <div className="p-5">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Lot {lot.lot_number}
                    </span>
                    <Badge value={lot.status} />
                  </div>
                  <Link href={`/auctions/${lot.id}`}>
                    <h2 className="text-base font-bold mt-4 mb-2">
                      {lot.car_title}
                    </h2>
                  </Link>
                  <p className="text-xs text-slate-500 capitalize">
                    {lot.damage_type} damage / {lot.damage_severity} ·{" "}
                    {lot.car_location}
                  </p>
                  <p className="text-2xl font-bold mt-5">
                    {money(
                      Number(lot.current_bid) > 0
                        ? lot.current_bid
                        : lot.starting_bid,
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {lot.bid_count} bids ·{" "}
                    {lot.status === "upcoming" ? "Starts" : "Ends"}{" "}
                    {date(
                      lot.status === "upcoming" ? lot.start_time : lot.end_time,
                    )}
                  </p>
                  <Link
                    href={`/auctions/${lot.id}`}
                    className="ws-button w-full mt-5"
                  >
                    View auction
                    <Icon name="arrow_forward" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {data && !loading && !error && (
          <Pager count={data.count} page={page} setPage={setPage} />
        )}
      </section>
    </div>
  );
}
