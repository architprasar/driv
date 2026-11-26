"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CreateAuction, AuctionControls } from "./AuctionTools";
import {
  PageHeader,
  ButtonLink,
  Badge,
  Empty,
  LoadState,
  Pager,
  Icon,
  useResource,
  type PageData,
  money,
  date,
  label,
} from "./WorkspaceUI";

type RecordItem = {
  id: number;
  order_id?: number;
  order_number?: string;
  auction_id?: number;
  title?: string;
  name?: string;
  lot_number?: string;
  current_bid?: string;
  amount?: string;
  total?: string;
  min_value?: string;
  max_value?: string;
  valid_until?: string;
  quantity?: number;
  item_count?: number;
  currency?: string;
  status: string;
  payment_status?: string;
  method?: string;
  leading?: boolean;
  bid_count?: number;
  car_title?: string;
  end_time?: string;
  created_at?: string;
  initiated_at?: string;
  description?: string;
  event_type?: string;
};
type Kind =
  | "orders"
  | "bids"
  | "sales"
  | "auctions"
  | "payments"
  | "payouts"
  | "activity"
  | "valuations";
const config: Record<
  Kind,
  {
    title: string;
    description: string;
    states: string[];
    action?: string;
    href?: string;
    icon: string;
  }
> = {
  orders: {
    title: "Orders",
    description: "Follow every purchase, from confirmation to your doorstep.",
    states: [
      "placed",
      "confirmed",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ],
    action: "Browse marketplace",
    href: "/cars",
    icon: "shopping_bag",
  },
  bids: {
    title: "My bids",
    description: "Follow your bidding history and see where you stand.",
    states: ["upcoming", "live", "ended", "sold"],
    action: "Explore auctions",
    href: "/auctions",
    icon: "gavel",
  },
  sales: {
    title: "Sales",
    description: "Follow your sales, delivery progress, and payment status.",
    states: [
      "pending",
      "processing",
      "shipped",
      "out_for_delivery",
      "ready_for_pickup",
      "delivered",
      "cancelled",
      "returned",
    ],
    icon: "receipt_long",
  },
  auctions: {
    title: "Auctions",
    description: "Monitor your auction lots, current bids, and closing times.",
    states: ["upcoming", "live", "ended", "sold"],
    action: "Manage vehicles",
    href: "/dashboard/cars",
    icon: "gavel",
  },
  payments: {
    title: "Payments",
    description:
      "A complete payment history with the original transaction currency.",
    states: ["pending", "processing", "completed", "failed", "refunded"],
    icon: "credit_card",
  },
  payouts: {
    title: "Payouts",
    description: "Follow the status of your business settlements.",
    states: ["pending", "processing", "completed", "failed"],
    icon: "account_balance",
  },
  activity: {
    title: "Business activity",
    description: "A chronological record of updates to your vendor business.",
    states: [],
    icon: "history",
  },
  valuations: {
    title: "Valuations",
    description: "Revisit your vehicle estimates and their validity dates.",
    states: [],
    action: "Value a vehicle",
    href: "/valuation",
    icon: "calculate",
  },
};
export default function Records({ kind }: { kind: Kind }) {
  const c = config[kind];
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    search: query,
    status,
    page: String(page),
    page_size: "10",
  });
  const url =
    kind === "orders"
      ? `/orders/?${params}`
      : `/dashboard/workspace/${kind}/?${params}`;
  const { data, error, loading, reload } =
    useResource<PageData<RecordItem>>(url);
  const amount = (row: RecordItem) =>
    row.currency
      ? money(row.amount || row.total || row.current_bid || 0, row.currency)
      : kind === "payments"
        ? "—"
        : money(row.amount || row.total || row.current_bid || 0);
  return (
    <>
      <PageHeader
        title={c.title}
        description={c.description}
        action={
          kind === "auctions" ? (
            <CreateAuction onChange={reload} />
          ) : (
            c.href && (
              <ButtonLink href={c.href}>
                <Icon name={c.icon} />
                {c.action}
              </ButtonLink>
            )
          )
        }
      />
      {kind === "payouts" && (
        <div className="ws-notice">
          <Icon name="info" />
          <p>
            Settlements appear here after they are initiated. Your sales totals
            and available payouts may differ.
          </p>
        </div>
      )}
      <section className="ws-panel">
        <div className="ws-toolbar">
          {kind !== "valuations" && kind !== "payouts" && (
            <label className="ws-search">
              <Icon name="search" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  kind === "orders" || kind === "payments"
                    ? "Search by order number"
                    : kind === "bids"
                      ? "Search by lot number"
                      : "Search records"
                }
                aria-label={`Search ${c.title.toLowerCase()}`}
              />
            </label>
          )}
          {c.states.length > 0 && (
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {c.states.map((s) => (
                <option value={s} key={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          )}
          <span className="ws-toolbar-count">{data?.count || 0} records</span>
        </div>
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            icon={c.icon}
            title={
              query || status
                ? "No matching records"
                : `No ${kind === "activity" ? "activity" : c.title.toLowerCase()} yet`
            }
            text={
              query || status
                ? "Change your search or status filter to see more results."
                : kind === "payouts"
                  ? "Your settlement history will appear here when a payout is initiated."
                  : kind === "sales"
                    ? "Orders containing your vehicles or parts will appear here."
                    : "Your records will appear here as you use the marketplace."
            }
            href={query || status ? undefined : c.href}
            action={c.action}
          />
        ) : kind === "activity" ? (
          <div>
            {data.results.map((row) => (
              <article className="ws-feed-row" key={row.id}>
                <span className="ws-empty-icon">
                  <Icon name="history" />
                </span>
                <div>
                  <h3>{label(row.event_type || "Business update")}</h3>
                  <p>{row.description}</p>
                  <small>{date(row.created_at)}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ws-table-scroll">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>
                    {kind === "auctions" || kind === "bids"
                      ? "Auction lot"
                      : kind === "valuations"
                        ? "Vehicle"
                        : kind === "sales"
                          ? "Item"
                          : kind === "payouts"
                            ? "Settlement"
                            : "Order"}
                  </th>
                  <th>
                    {kind === "valuations"
                      ? "Estimated range"
                      : kind === "auctions"
                        ? "Current bid"
                        : "Amount"}
                  </th>
                  {kind !== "valuations" && <th>Status</th>}
                  <th>
                    {kind === "auctions" || kind === "bids"
                      ? "Ends"
                      : kind === "valuations"
                        ? "Valid until"
                        : "Date"}
                  </th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>
                        {row.car_title ||
                          row.title ||
                          row.name ||
                          row.order_number ||
                          `Payout #${row.id}`}
                      </strong>
                      {(row.lot_number || row.item_count || row.quantity) && (
                        <p className="text-[10px] mt-1">
                          {row.lot_number
                            ? `Lot ${row.lot_number}`
                            : `${row.item_count || row.quantity} item(s)`}
                        </p>
                      )}
                    </td>
                    <td className="ws-number">
                      {kind === "valuations"
                        ? `${money(row.min_value)} – ${money(row.max_value)}`
                        : amount(row)}
                      {kind === "bids" && (
                        <p className="text-[10px] font-normal mt-1">
                          Current: {money(row.current_bid)}
                        </p>
                      )}
                    </td>
                    {kind !== "valuations" && (
                      <td>
                        <Badge
                          value={
                            kind === "bids" && row.status === "live"
                              ? row.leading
                                ? "leading"
                                : "outbid"
                              : row.status
                          }
                        />
                        {kind === "sales" && (
                          <p className="text-[10px] mt-1">
                            Payment: {label(row.payment_status || "unpaid")}
                          </p>
                        )}
                      </td>
                    )}
                    <td>
                      {date(
                        row.end_time ||
                          row.valid_until ||
                          row.created_at ||
                          row.initiated_at,
                      )}
                    </td>
                    <td>
                      <div className="ws-row-actions">
                        {kind === "orders" || kind === "payments" ? (
                          <Link
                            className="ws-text-link"
                            href={`/profile/orders/${row.order_id || row.id}`}
                          >
                            View order
                            <Icon name="arrow_forward" />
                          </Link>
                        ) : kind === "auctions" || kind === "bids" ? (
                          <Link
                            className="ws-text-link"
                            href={`/auctions/${row.auction_id || row.id}`}
                          >
                            Open auction
                            <Icon name="arrow_forward" />
                          </Link>
                        ) : kind === "payouts" ? (
                          "Bank settlement"
                        ) : kind === "valuations" ? (
                          `Requested ${date(row.created_at)}`
                        ) : kind === "sales" ? (
                          <Link
                            className="ws-text-link"
                            href={`/dashboard/sales/${row.id}`}
                          >
                            Manage sale
                            <Icon name="arrow_forward" />
                          </Link>
                        ) : (
                          row.order_number || "—"
                        )}
                        {kind === "auctions" && (
                          <AuctionControls
                            id={row.id}
                            status={row.status}
                            onChange={reload}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && data && (
          <Pager count={data.count} page={page} setPage={setPage} />
        )}
      </section>
    </>
  );
}
