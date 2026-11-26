"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut as endSession } from "@/lib/auth-session";
import { Icon, LoadState, useResource, Empty } from "./WorkspaceUI";
import "./workspace.css";

export type WorkspaceUser = {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  role: string;
  is_verified: boolean;
  email_verified: boolean;
  phone: string;
  date_joined: string;
};
const UserContext = createContext<WorkspaceUser | null>(null);
export function useWorkspaceUser() {
  return useContext(UserContext);
}
const account = [
  ["Overview", "/profile", "space_dashboard"],
  ["Orders", "/profile/orders", "shopping_bag"],
  ["My bids", "/profile/bids", "gavel"],
  ["Payments", "/profile/payments", "credit_card"],
  ["Saved vehicles", "/profile/favorites", "bookmark"],
  ["Saved searches", "/profile/saved", "saved_search"],
  ["Messages & enquiries", "/profile/enquiries", "forum"],
  ["Returns & refunds", "/profile/returns", "assignment_return"],
  ["Valuations", "/profile/valuations", "calculate"],
];
const selling = [
  ["Selling overview", "/dashboard", "space_dashboard"],
  ["Vehicles", "/dashboard/cars", "directions_car"],
  ["Parts inventory", "/dashboard/parts", "manufacturing"],
  ["Sales", "/dashboard/sales", "receipt_long"],
  ["Messages & enquiries", "/dashboard/enquiries", "forum"],
  ["Returns & refunds", "/dashboard/returns", "assignment_return"],
  ["Auctions", "/dashboard/auctions", "gavel"],
  ["Performance", "/dashboard/analytics", "monitoring"],
];
const vendor = [
  ["Business overview", "/vendor/dashboard", "space_dashboard"],
  ["Vehicle inventory", "/vendor/dashboard/listings", "directions_car"],
  ["Auctions", "/vendor/dashboard/auctions", "gavel"],
  ["Sales", "/vendor/dashboard/sales", "receipt_long"],
  ["Messages & enquiries", "/vendor/dashboard/enquiries", "forum"],
  ["Returns & refunds", "/vendor/dashboard/returns", "assignment_return"],
  ["Earnings & settlements", "/vendor/dashboard/payouts", "account_balance"],
  ["Activity", "/vendor/dashboard/activity", "history"],
  ["Business details", "/vendor/dashboard/business", "storefront"],
];
const settings = [
  ["Notifications", "/profile/notifications", "notifications"],
  ["Addresses", "/profile/addresses", "location_on"],
  ["Account settings", "/profile/settings", "manage_accounts"],
  ["Help & support", "/profile/support", "help"],
];

export default function WorkspaceShell({
  children,
  mode = "account",
}: {
  children: ReactNode;
  mode?: "account" | "seller" | "vendor";
}) {
  const [menu, setMenu] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = sidebar.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!items?.length) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === items[items.length - 1]
      ) {
        event.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, [menu]);
  const path = usePathname();
  const router = useRouter();
  const {
    data: user,
    error,
    loading,
    reload,
  } = useResource<WorkspaceUser>("/auth/me/");
  const links =
    mode === "vendor" ? vendor : mode === "seller" ? selling : account;
  const isActive = (href: string) =>
    path === href ||
    (!["/profile", "/dashboard", "/vendor/dashboard"].includes(href) &&
      path.startsWith(href + "/"));
  const active =
    [...links, ...settings].find(([, href]) => isActive(href))?.[0] ||
    "Workspace";
  const signOut = async () => {
    try {
      await endSession();
    } catch {
      /* Local cookies are cleared even if the server is unavailable. */
    }
    router.replace("/login");
    router.refresh();
  };
  if (!user)
    return (
      <div className="ws-auth">
        <h1 className="text-2xl font-bold mb-5">
          {error ? "We couldn’t load your workspace" : "Loading your workspace"}
        </h1>
        <LoadState loading={loading} error={error} retry={reload} />
        <Link
          href={`/login?next=${encodeURIComponent(path)}`}
          className="ws-text-link"
        >
          Sign in to your account
        </Link>
      </div>
    );
  return (
    <UserContext.Provider value={user}>
      <div className="workspace">
        {menu && (
          <button
            className="ws-nav-backdrop"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          />
        )}
        <aside
          ref={sidebar}
          className={`ws-sidebar ${menu ? "is-open" : ""}`}
          aria-label="Workspace navigation"
        >
          <Link href="/" className="ws-logo">
            <Image
              src="/drivio-logo-light.png"
              alt="DrivioCars"
              width={172}
              height={39}
              priority
            />
          </Link>
          <div className="ws-workspace-picker">
            <span className="ws-workspace-mark">
              <Icon
                name={
                  mode === "vendor"
                    ? "storefront"
                    : mode === "seller"
                      ? "garage"
                      : "account_circle"
                }
              />
            </span>
            <div>
              <strong>
                {mode === "vendor"
                  ? "Vendor workspace"
                  : mode === "seller"
                    ? "Seller workspace"
                    : "My account"}
              </strong>
              <span>{user.display_name || user.username}</span>
            </div>
          </div>
          <nav>
            <p className="ws-nav-label">
              {mode === "account" ? "Your marketplace" : "Manage your business"}
            </p>
            {links.map(([title, href, icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenu(false)}
                aria-current={isActive(href) ? "page" : undefined}
                className={isActive(href) ? "active" : ""}
              >
                <Icon name={icon} />
                {title}
              </Link>
            ))}
            <p className="ws-nav-label">Account</p>
            {settings.map(([title, href, icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenu(false)}
                aria-current={isActive(href) ? "page" : undefined}
                className={isActive(href) ? "active" : ""}
              >
                <Icon name={icon} />
                {title}
              </Link>
            ))}
          </nav>
          <div className="ws-switcher">
            <Link href={mode === "account" ? "/dashboard" : "/profile"}>
              <Icon name="swap_horiz" />
              {mode === "account"
                ? "Switch to selling"
                : "Switch to my account"}
            </Link>
            {mode !== "vendor" && (
              <Link href="/vendor/dashboard">
                <Icon name="storefront" />
                Vendor workspace
              </Link>
            )}
          </div>
          <div className="ws-sidebar-user">
            <span className="ws-avatar">
              {(user.display_name || user.username).slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.display_name || user.username}</strong>
              <span>{user.email}</span>
            </div>
            <button aria-label="Sign out" onClick={signOut}>
              <Icon name="logout" />
            </button>
          </div>
        </aside>
        <div className="ws-main">
          <header className="ws-topbar">
            <div className="ws-breadcrumb">
              <button
                className="ws-menu-button"
                aria-label="Open navigation"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Icon name="menu" />
              </button>
              <span>Workspace</span>
              <Icon name="chevron_right" />
              <strong>{active}</strong>
            </div>
            <div className="ws-top-actions">
              <Link href="/cars" className="ws-market-link">
                Explore marketplace
                <Icon name="north_east" />
              </Link>
              <Link
                href="/profile/notifications"
                className="ws-icon-button"
                aria-label="Notifications"
              >
                <Icon name="notifications" />
              </Link>
              <Link
                href="/profile/settings"
                className="ws-avatar"
                aria-label="Account settings"
              >
                {(user.display_name || user.username).slice(0, 2).toUpperCase()}
              </Link>
            </div>
          </header>
          <div className="ws-content">
            {mode === "vendor" ? (
              <VendorAccess>{children}</VendorAccess>
            ) : (
              children
            )}
          </div>
          <footer className="ws-footer">
            <span>© {new Date().getFullYear()} DrivioCars</span>
            <span>Cars for a brighter tomorrow.</span>
            <Link href="/profile/support">Get help</Link>
          </footer>
        </div>
      </div>
    </UserContext.Provider>
  );
}

function VendorAccess({ children }: { children: ReactNode }) {
  const { data, error, loading, reload } = useResource<{
    business_name: string;
  }>("/vendors/dashboard/");
  if (error === "Not a vendor.")
    return (
      <section className="ws-panel">
        <Empty
          icon="storefront"
          title="Set up your vendor workspace"
          text="Register your business to manage inventory, auctions, documents, and payouts in one place."
          href="/vendor/register"
          action="Register your business"
        />
      </section>
    );
  if (loading || error || !data)
    return <LoadState loading={loading} error={error} retry={reload} />;
  return children;
}
