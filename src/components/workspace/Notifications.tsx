"use client";
import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  useResource,
  PageHeader,
  LoadState,
  Empty,
  Icon,
  Pager,
  Badge,
  date,
  label,
  errorMessage,
  type PageData,
} from "./WorkspaceUI";
type Notification = {
  id: number;
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string;
  created_at: string;
};
export default function Notifications() {
  const [category, setCategory] = useState("");
  const [read, setRead] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useResource<PageData<Notification>>(
    `/notifications/?${new URLSearchParams({ category, ...(read ? { is_read: read } : {}), page: String(page) })}`,
  );
  const count = useResource<{ unread_count: number }>(
    "/notifications/unread_count/",
  );
  const mark = async (id?: number) => {
    setBusy(true);
    setError("");
    try {
      if (id) await apiClient.patch(`/notifications/${id}/read/`);
      else await apiClient.post("/notifications/read-all/");
      reload();
      count.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${count.data?.unread_count || 0} unread updates on your orders, bids, and account.`}
        action={
          <button
            className="ws-button secondary"
            disabled={busy || !count.data?.unread_count}
            onClick={() => mark()}
          >
            <Icon name="done_all" />
            Mark all as read
          </button>
        }
      />
      {error && (
        <div className="ws-notice error" role="alert">
          {error}
        </div>
      )}
      <section className="ws-panel">
        <div className="ws-toolbar">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            aria-label="Notification category"
          >
            <option value="">All categories</option>
            {["bids", "market", "account", "orders"].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            value={read}
            onChange={(e) => {
              setRead(e.target.value);
              setPage(1);
            }}
            aria-label="Read status"
          >
            <option value="">All updates</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <span className="ws-toolbar-count">{data?.count || 0} updates</span>
        </div>
        {loading || loadError ? (
          <LoadState loading={loading} error={loadError} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            icon="notifications_none"
            title="You’re all caught up"
            text="Updates matching this filter will appear here."
          />
        ) : (
          data.results.map((item) => (
            <article
              className={`ws-feed-row ${item.is_read ? "" : "unread"}`}
              key={item.id}
            >
              <span className="ws-empty-icon">
                <Icon
                  name={
                    item.category === "bids"
                      ? "gavel"
                      : item.category === "orders"
                        ? "shopping_bag"
                        : "notifications"
                  }
                />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <small>
                  {date(item.created_at)}{" "}
                  <span className="ml-2">
                    <Badge value={item.category} />
                  </span>
                </small>
              </div>
              <div className="ws-row-actions">
                {!item.is_read && (
                  <button disabled={busy} onClick={() => mark(item.id)}>
                    Mark read
                  </button>
                )}
                {item.action_url?.startsWith("/") &&
                  !item.action_url.startsWith("//") && (
                    <Link href={item.action_url}>View details</Link>
                  )}
              </div>
            </article>
          ))
        )}
        {!loading && !loadError && data && (
          <Pager count={data.count} page={page} setPage={setPage} size={20} />
        )}
      </section>
    </>
  );
}
