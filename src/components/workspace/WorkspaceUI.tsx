"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import axios from "axios";

export function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}
export function money(value: string | number = 0, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
export function date(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
}
export function label(value: string) {
  return value.replace(/_/g, " ");
}
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.detail === "string")
      return (
        data.detail +
        (data.request_id && error.response!.status >= 500
          ? ` Support reference: ${data.request_id}.`
          : "")
      );
    if (error.response?.status === 429)
      return "Too many attempts. Please wait a moment before trying again.";
    if (error.response && error.response.status >= 500)
      return "This service is temporarily unavailable. Check your saved orders before repeating a purchase, then try again.";
    if (!error.response)
      return "We couldn’t reach the server. Check your connection. If you were checking out, review your saved orders before trying again.";
    if (data && typeof data === "object")
      return Object.entries(data)
        .map(
          ([key, value]) =>
            `${label(key)}: ${Array.isArray(value) ? value.join(" ") : String(value)}`,
        )
        .join(" ");
  }
  return "We couldn’t load this information. Check your connection and try again.";
}
export function useResource<T>(url: string) {
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  } | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${url}::${version}`;
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<T>(url, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ key, data: response.data, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [url, key]);
  return {
    data: state?.key === key ? state.data : null,
    loading: state?.key !== key,
    error: state?.key === key ? state.error : "",
    reload,
  };
}
export type PageData<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="ws-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={`ws-button ${secondary ? "secondary" : ""}`}>
      {children}
    </Link>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`ws-badge ${["active", "verified", "completed", "delivered", "sold", "leading", "resolved"].includes(value) ? "positive" : ["failed", "cancelled", "rejected", "out_of_stock", "outbid"].includes(value) ? "negative" : ["live", "pending", "low_stock", "processing", "under_review", "open"].includes(value) ? "warning" : ""}`}
    >
      {label(value)}
    </span>
  );
}
export function Empty({
  title,
  text,
  href,
  action,
  icon = "inbox",
}: {
  title: string;
  text: string;
  href?: string;
  action?: string;
  icon?: string;
}) {
  return (
    <div className="ws-empty">
      <span className="ws-empty-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <ButtonLink href={href}>
          {action || "Get started"}
          <Icon name="arrow_forward" />
        </ButtonLink>
      )}
    </div>
  );
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <div className="ws-loading" role="status">
        <span className="ws-spinner" />
        Loading workspace…
      </div>
    );
  if (error)
    return (
      <div className="ws-notice error" role="alert">
        <Icon name="error" />
        <div>
          <strong>Something needs your attention</strong>
          <p>{error}</p>
        </div>
        <button className="ws-button secondary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  return null;
}
export function Pager({
  count,
  page,
  setPage,
  size = 10,
}: {
  count: number;
  page: number;
  setPage: (page: number) => void;
  size?: number;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="ws-pager">
      <p>
        {count
          ? `${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count}`
          : "0 results"}
      </p>
      <div>
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <Icon name="chevron_left" />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          <Icon name="chevron_right" />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="ws-modal"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="ws-modal-head">
        <h2>{title}</h2>
        <button
          className="ws-icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Metric({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: ReactNode;
  note: string;
  icon: string;
}) {
  return (
    <div className="ws-metric">
      <div>
        <span>{title}</span>
        <Icon name={icon} />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="ws-panel">
      <div className="ws-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
