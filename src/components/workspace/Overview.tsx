"use client";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import {
  useResource,
  PageHeader,
  ButtonLink,
  Metric,
  Panel,
  Icon,
  Badge,
  Empty,
  LoadState,
  money,
  date,
} from "./WorkspaceUI";
import { useWorkspaceUser } from "./WorkspaceShell";
import { getMediaUrl } from "@/lib/runtime-config";

export type Summary = {
  cars: number;
  active_cars: number;
  draft_cars: number;
  sold_cars: number;
  parts: number;
  low_stock: number;
  views: number;
  live_auctions: number;
  auction_bids: number;
  active_bids: number;
  orders: number;
  open_orders: number;
  unread_notifications: number;
  saved_searches: number;
  sales_count: number;
  paid_sales_value: string;
  monthly_sales_value: string;
  sales_currency: string;
  sales_currencies: string[];
  sales_history: { month: string; amount: string }[];
  payment_totals: { currency: string; status: string; amount: string }[];
  inventory_status: { status: string; count: number }[];
  recent_orders: {
    id: number;
    order_number: string;
    created_at: string;
    status: string;
    total: string;
    item_count: number;
  }[];
  recent_cars: {
    id: number;
    year: number;
    brand_name: string;
    model_name: string;
    primary_image?: { image: string };
    price: string;
    status: string;
    views_count: number;
  }[];
  vendor: {
    business_name: string;
    verification_status: string;
    tier: string;
  } | null;
};

export function SalesChart({ data }: { data: Summary }) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 5 + i);
    const month = d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return {
      month,
      amount: Number(
        data.sales_history.find((row) => row.month === month)?.amount || 0,
      ),
    };
  });
  const max = Math.max(...months.map((row) => row.amount), 1);
  return (
    <>
      <div
        className="ws-chart"
        role="img"
        aria-label={`Monthly paid sales: ${months.map((row) => `${row.month}: ${money(row.amount, data.sales_currency)}`).join(", ")}`}
      >
        {months.map((row) => (
          <div className="ws-chart-column" key={row.month}>
            <div
              style={{ height: `${Math.max(1, (row.amount / max) * 135)}px` }}
              title={`${row.month}: ${money(row.amount, data.sales_currency)}`}
            />
            <small>{row.month.split(" ")[0]}</small>
          </div>
        ))}
      </div>
      <p className="ws-chart-note">
        Completed order payments in {data.sales_currency}. Cancelled orders are
        excluded.
      </p>
    </>
  );
}
export function VendorOnboarding() {
  return (
    <>
      <PageHeader
        title="Your business, on DrivioCars"
        description="A dedicated workspace for your inventory, auctions, and payouts."
      />
      <section className="ws-panel">
        <Empty
          icon="storefront"
          title="Set up your vendor account"
          text="Register your business and provide your documents to access your vendor workspace."
          href="/vendor/register"
          action="Register your business"
        />
      </section>
    </>
  );
}

export default function Overview({
  mode = "account",
}: {
  mode?: "account" | "seller" | "vendor" | "analytics";
}) {
  const user = useWorkspaceUser();
  const [currency, setCurrency] = useState("");
  const { data, error, loading, reload } = useResource<Summary>(
    `/dashboard/workspace/summary/${currency ? `?currency=${currency}` : ""}`,
  );
  const business = mode !== "account";
  const base = mode === "vendor" ? "/vendor/dashboard" : "/dashboard";
  if (!data || loading || error)
    return <LoadState loading={loading} error={error} retry={reload} />;
  if (mode === "vendor" && !data.vendor) return <VendorOnboarding />;
  return (
    <>
      <PageHeader
        title={
          mode === "analytics"
            ? "Performance"
            : mode === "vendor"
              ? data.vendor!.business_name
              : business
                ? "Selling overview"
                : `Welcome back, ${user?.username || "driver"}`
        }
        description={
          mode === "analytics"
            ? "Understand your inventory, customer interest, and completed sales."
            : business
              ? "A clear view of your inventory and what needs your attention."
              : "Your orders, auctions, and next steps, all in one place."
        }
        action={
          <ButtonLink href={business ? "/dashboard/cars/new" : "/cars"}>
            <Icon name={business ? "add" : "search"} />
            {business ? "List a vehicle" : "Explore cars"}
          </ButtonLink>
        }
      />
      {business && data.sales_currencies.length > 1 && (
        <div className="ws-toolbar mb-5 rounded-lg bg-white border border-slate-200">
          <label className="text-xs text-slate-500" htmlFor="sales-currency">
            Sales currency
          </label>
          <select
            id="sales-currency"
            value={data.sales_currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {data.sales_currencies.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
          <span className="ws-toolbar-count">
            Revenue is shown separately for each currency.
          </span>
        </div>
      )}
      <div className="ws-metrics">
        {business ? (
          <>
            <Metric
              title="Active vehicles"
              value={data.active_cars}
              note={`${data.cars} vehicles in your inventory`}
              icon="directions_car"
            />
            <Metric
              title="Paid sales this month"
              value={money(data.monthly_sales_value, data.sales_currency)}
              note="Your items in completed payments"
              icon="payments"
            />
            <Metric
              title="Listing views"
              value={data.views.toLocaleString("en-IN")}
              note="Lifetime views on your vehicles"
              icon="visibility"
            />
            <Metric
              title="Live auctions"
              value={data.live_auctions}
              note={`${data.auction_bids} bids received in total`}
              icon="gavel"
            />
          </>
        ) : (
          <>
            <Metric
              title="Orders"
              value={data.orders}
              note={`${data.open_orders} awaiting delivery`}
              icon="shopping_bag"
            />
            <Metric
              title="Live auction bids"
              value={data.active_bids}
              note="Auctions you’re participating in"
              icon="gavel"
            />
            <Metric
              title="Saved searches"
              value={data.saved_searches}
              note="Your saved vehicle preferences"
              icon="saved_search"
            />
            <Metric
              title="Unread notifications"
              value={data.unread_notifications}
              note="Updates that need your attention"
              icon="notifications"
            />
          </>
        )}
      </div>
      {mode !== "analytics" && (
        <div className="ws-welcome">
          <div>
            <h2>
              {business
                ? data.draft_cars
                  ? `${data.draft_cars} vehicle${data.draft_cars === 1 ? " is" : "s are"} ready for your next step`
                  : "Make room for your next sale."
                : "Your next chapter starts with the right car."}
            </h2>
            <p>
              {business
                ? "Keep your listings current, review your stock, and follow every sale from one workspace."
                : "Explore inspected vehicles, keep track of your bids, and find the car that fits your everyday."}
            </p>
            <ButtonLink
              href={
                business
                  ? `${base}/${mode === "vendor" ? "listings" : "cars"}`
                  : "/cars"
              }
            >
              {business ? "Manage inventory" : "Find your next car"}
              <Icon name="arrow_forward" />
            </ButtonLink>
          </div>
          <div className="ws-welcome-art" aria-hidden="true">
            <Icon name="garage" />
          </div>
        </div>
      )}
      <div className="ws-grid">
        <Panel
          title={business ? "Sales performance" : "Recent orders"}
          action={
            <Link
              className="ws-text-link"
              href={business ? "/dashboard/analytics" : "/profile/orders"}
            >
              {business ? "View performance" : "View all orders"}
              <Icon name="arrow_forward" />
            </Link>
          }
        >
          {business ? (
            <div className="ws-panel-body">
              <div className="ws-stock-row">
                <span>Paid sales, last six months</span>
                <strong>
                  {money(data.paid_sales_value, data.sales_currency)}{" "}
                  <small className="text-slate-400 font-normal">lifetime</small>
                </strong>
              </div>
              <SalesChart data={data} />
            </div>
          ) : data.recent_orders.length ? (
            <div className="ws-table-scroll">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.order_number}</strong>
                        <p>{date(o.created_at)}</p>
                      </td>
                      <td>{o.item_count}</td>
                      <td>
                        <Badge value={o.status} />
                      </td>
                      <td>
                        <Link
                          className="ws-text-link"
                          href={`/profile/orders/${o.id}`}
                        >
                          Track order
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon="shopping_bag"
              title="Your first order starts here"
              text="When you place an order, you can follow its progress here."
              href="/cars"
              action="Browse cars"
            />
          )}
        </Panel>
        <Panel title={business ? "Needs attention" : "Quick access"}>
          <div className="ws-quick-links">
            {(business
              ? [
                  [
                    `${data.draft_cars} vehicle drafts`,
                    "Review and publish your listings",
                    `${base}/${mode === "vendor" ? "listings" : "cars"}?status=draft`,
                    "edit_note",
                  ],
                  [
                    `${data.low_stock} parts running low`,
                    "Review stock of three units or fewer",
                    "/dashboard/parts?status=low_stock",
                    "inventory_2",
                  ],
                  [
                    `${data.unread_notifications} unread updates`,
                    "Bids, orders, and account activity",
                    "/profile/notifications",
                    "notifications",
                  ],
                ]
              : [
                  [
                    "My bids",
                    "Follow the auctions you’re bidding on",
                    "/profile/bids",
                    "gavel",
                  ],
                  [
                    "Saved searches",
                    "Return to your vehicle preferences",
                    "/profile/saved",
                    "saved_search",
                  ],
                  [
                    "Delivery addresses",
                    "Keep your checkout details up to date",
                    "/profile/addresses",
                    "location_on",
                  ],
                ]
            ).map(([title, text, href, icon]) => (
              <Link href={href} key={title}>
                <span className="ws-quick-icon">
                  <Icon name={icon} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </div>
                <Icon name="chevron_right" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
      {business ? (
        <div className="ws-grid">
          <Panel
            title="Recently added vehicles"
            action={
              <Link
                className="ws-text-link"
                href={`${base}/${mode === "vendor" ? "listings" : "cars"}`}
              >
                View inventory
                <Icon name="arrow_forward" />
              </Link>
            }
          >
            {data.recent_cars.length ? (
              <div className="ws-table-scroll">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_cars.map((car) => (
                      <tr key={car.id}>
                        <td>
                          <Link className="ws-item" href={`/cars/${car.id}`}>
                            <span className="ws-item-image">
                              {car.primary_image?.image ? (
                                <Image
                                  src={getMediaUrl(car.primary_image.image)}
                                  alt=""
                                  fill
                                  sizes="72px"
                                />
                              ) : (
                                <Icon name="directions_car" />
                              )}
                            </span>
                            <strong>
                              {car.year} {car.brand_name} {car.model_name}
                            </strong>
                          </Link>
                        </td>
                        <td className="ws-number">{money(car.price)}</td>
                        <td>
                          <Badge value={car.status} />
                        </td>
                        <td>{car.views_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Your inventory starts here"
                text="Add your first vehicle to start reaching buyers."
                href="/dashboard/cars/new"
                action="List a vehicle"
              />
            )}
          </Panel>
          <Panel title="Inventory health">
            <div className="ws-panel-body">
              {["active", "draft", "sold", "archived"].map((status) => {
                const count =
                  data.inventory_status.find((row) => row.status === status)
                    ?.count || 0;
                return (
                  <div key={status}>
                    <div className="ws-stock-row">
                      <span className="capitalize">{status}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="ws-progress">
                      <span
                        style={{
                          width: `${(count / Math.max(data.cars, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <Link href="/dashboard/parts" className="ws-text-link">
                Manage {data.parts} parts
                <Icon name="arrow_forward" />
              </Link>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="ws-grid equal">
          <Panel title="Your account">
            <dl className="ws-detail-list">
              <div>
                <dt>Account</dt>
                <dd>{user?.username}</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>
                  <Badge value={user?.is_verified ? "verified" : "pending"} />
                </dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{date(user?.date_joined)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Start selling">
            <div className="ws-panel-body">
              <p className="text-sm text-slate-500 mb-5">
                Give your vehicle or spare parts a new home. Manage listings and
                sales in your seller workspace.
              </p>
              <ButtonLink href="/dashboard" secondary>
                Open seller workspace
                <Icon name="arrow_forward" />
              </ButtonLink>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
