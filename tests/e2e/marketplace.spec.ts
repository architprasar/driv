import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
type Fixture = {
  buyer: { email: string; password: string };
  seller: { email: string; password: string };
  rival: { email: string; password: string };
  part: number;
  car: number;
  auction_car: number;
};
let fixture: Fixture, partOrder: number;
const base = "http://localhost:3100";
test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
  fixture = JSON.parse(
    readFileSync(join(process.env.DRIVIO_QA_ROOT!, "fixture.json"), "utf8"),
  );
});
async function api(
  context: BrowserContext,
  path: string,
  method = "GET",
  data?: unknown,
) {
  const response = await context.request.fetch(
    `${base}/api/marketplace${path}`,
    { method, data, headers: { Origin: base } },
  );
  expect(
    response.ok(),
    `${method} ${path}: ${await response.text()}`,
  ).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}
async function login(
  context: BrowserContext,
  role: "buyer" | "seller" | "rival" = "buyer",
) {
  await api(context, "/auth/login", "POST", fixture[role]);
}
async function loaded(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".ws-loading")).toHaveCount(0);
}
async function pay(page: Page) {
  await page
    .getByRole("button", { name: "Continue to test payment", exact: true })
    .click();
  // Wait for the server's confirmation itself: after a declined attempt the
  // payment heading can already be gone, so its absence alone is a race.
  const confirmation = page.waitForResponse(
    (response) =>
      response.url().includes("/payments/confirm") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Simulate successful payment", exact: true })
    .click();
  expect((await confirmation).ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Complete your payment", exact: true }),
  ).toHaveCount(0);
}

test("login protects tokens and rejects cross-origin mutations", async ({
  page,
  context,
}) => {
  await page.goto("/login?next=%2Fprofile%2Forders");
  await page.getByLabel("Email", { exact: true }).fill(fixture.buyer.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(fixture.buyer.password);
  const result = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/marketplace/auth/login") && r.status() === 200,
  );
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  expect((await (await result).json()).tokens).toBeUndefined();
  await expect(page).toHaveURL(/\/profile\/orders$/);
  await expect(
    page.getByRole("heading", { name: "Orders", exact: true }),
  ).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "access_token")?.httpOnly).toBeTruthy();
  expect(
    cookies.find((c) => c.name === "refresh_token")?.httpOnly,
  ).toBeTruthy();
  expect(await page.evaluate(() => document.cookie)).not.toMatch(
    /access_token|refresh_token/,
  );
  const rejected = await context.request.post("/api/marketplace/cart/items", {
    headers: { Origin: "https://unrelated.example" },
    data: { item_id: fixture.part, item_type: "part", quantity: 1 },
  });
  expect(rejected.status()).toBe(403);
});

test("refresh service outage keeps the session and recovers with Retry", async ({
  page,
  context,
}) => {
  await login(context);
  await context.addCookies([
    {
      name: "access_token",
      value: "expired-test-token",
      url: base,
      httpOnly: true,
    },
  ]);
  await page.route("**/api/marketplace/auth/token/refresh", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Temporarily unavailable. Please retry.",
      }),
    }),
  );
  await page.goto("/profile/orders");
  await expect(
    page.getByRole("alert").filter({ hasText: "Temporarily unavailable" }),
  ).toContainText("Temporarily unavailable");
  expect(page.url()).toContain("/profile/orders");
  expect(
    (await context.cookies()).some((c) => c.name === "refresh_token"),
  ).toBeTruthy();
  await page.unroute("**/api/marketplace/auth/token/refresh");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Orders", exact: true }),
  ).toBeVisible();
});

test("an interrupted checkout recovers its original order and retries payment", async ({
  page,
  context,
}) => {
  await login(context);
  await loaded(page, `/parts/${fixture.part}`);
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Added to your cart");
  await page.goto("/checkout");
  let saved: number | undefined;
  await page.route(
    "**/api/marketplace/orders/create_from_cart",
    async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      saved = (await response.json()).id;
      await route.abort("failed");
    },
  );
  await page
    .getByRole("button", {
      name: "Reserve and continue to payment",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: /reach|connection|saved/ }),
  ).toContainText(/reach|connection|saved/);
  expect(saved).toBeTruthy();
  await page.unroute("**/api/marketplace/orders/create_from_cart");
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/profile/orders/${saved}$`));
  partOrder = saved!;
  expect((await api(context, "/orders/")).count).toBe(1);
  await page
    .getByRole("button", { name: "Continue to test payment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate decline", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "declined" }),
  ).toContainText("declined");
  await pay(page);
  expect((await api(context, `/orders/${partOrder}/`)).status).toBe(
    "confirmed",
  );
});

test("seller dispatch, receipt, verified review and return refund complete", async ({
  page,
  context,
  browser,
}) => {
  await login(context);
  const order = await api(context, `/orders/${partOrder}/`);
  const item = order.items[0].id;
  const seller = await browser.newContext();
  await login(seller, "seller");
  await api(seller, `/orders/sales/${item}/`, "PATCH", {
    status: "processing",
  });
  await api(seller, `/orders/sales/${item}/`, "PATCH", {
    status: "shipped",
    tracking_number: "QA-TRACK",
    carrier: "Test Courier",
  });
  await loaded(page, `/profile/orders/${partOrder}`);
  await page
    .getByRole("button", { name: "Confirm received", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm received", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review purchase", exact: true })
    .click();
  await page
    .locator("[name=body]")
    .fill("Arrived as described after confirming fitment with the seller.");
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Request return", exact: true })
    .click();
  await page
    .locator("[name=reason]")
    .fill("Please arrange return for this incorrect fit.");
  await page
    .getByRole("button", { name: "Send return request", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returns = await api(context, "/orders/returns/");
  await api(
    seller,
    `/orders/returns/${returns.results[0].id}/decision/`,
    "POST",
    {
      status: "approved",
      seller_note: "Return to QA Garage at the agreed address.",
    },
  );
  await api(
    seller,
    `/orders/returns/${returns.results[0].id}/decision/`,
    "POST",
    { status: "received", seller_note: "Physically received and accepted." },
  );
  expect((await api(context, `/orders/${partOrder}/`)).payment.status).toBe(
    "refunded",
  );
  await seller.close();
});

test("a car purchase requires explicit keys and document handover", async ({
  page,
  context,
  browser,
}) => {
  await login(context);
  await page.goto(`/checkout?car=${fixture.car}`);
  await page
    .getByRole("button", {
      name: "Reserve and continue to payment",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/profile\/orders\/\d+$/);
  const id = Number(page.url().split("/").pop());
  await pay(page);
  const item = (await api(context, `/orders/${id}/`)).items[0].id;
  const seller = await browser.newContext();
  await login(seller, "seller");
  await api(seller, `/orders/sales/${item}/`, "PATCH", {
    status: "processing",
  });
  await api(seller, `/orders/sales/${item}/`, "PATCH", {
    status: "ready_for_pickup",
    fulfillment_note: "Collect the keys and transfer documents at QA Garage.",
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Confirm vehicle handover", exact: true })
    .click();
  await page.locator("[name=keys_received]").check();
  await page.locator("[name=documents_received]").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm received", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await api(context, `/orders/${id}/`)).status).toBe("delivered");
  await seller.close();
});

test("auction proxy privacy and winner-only payment survive the complete flow", async ({
  page,
  context,
  browser,
}) => {
  await login(context);
  const seller = await browser.newContext(),
    rival = await browser.newContext();
  await login(seller, "seller");
  await login(rival, "rival");
  const lot = await api(seller, "/auctions/", "POST", {
    car: fixture.auction_car,
    lot_number: "QA-AUCTION",
    start_time: new Date(Date.now() - 1000).toISOString(),
    end_time: new Date(Date.now() + 300000).toISOString(),
    starting_bid: "100000",
    reserve_price: "110000",
    min_increment: "1000",
  });
  await page.goto(`/auctions/${lot.id}`);
  await page.getByLabel("Use a private maximum bid", { exact: true }).check();
  await page.getByLabel("Maximum bid (INR)", { exact: true }).fill("150000");
  await page
    .getByRole("button", { name: "Register proxy limit", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("registered");
  await api(rival, `/auctions/${lot.id}/place_bid/`, "POST", {
    amount: "120000",
  });
  const view = await api(rival, `/auctions/${lot.id}/`);
  expect(
    view.bids
      .filter((b: { is_proxy: boolean }) => b.is_proxy)
      .every((b: { proxy_max?: string }) => b.proxy_max === undefined),
  ).toBeTruthy();
  const closed = await api(seller, `/auctions/${lot.id}/close/`, "POST", {});
  const forbidden = await rival.request.get(
    `/api/marketplace/orders/${closed.order_id}`,
  );
  expect(forbidden.status()).toBe(404);
  await page.getByRole("link", { name: /Open winner checkout/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/profile/orders/${closed.order_id}$`),
  );
  await pay(page);
  expect((await api(context, `/orders/${closed.order_id}/`)).status).toBe(
    "confirmed",
  );
  await seller.close();
  await rival.close();
});

test("catalogue pagination, help and missing pages provide real next steps", async ({
  page,
}) => {
  await page.goto("/parts/list?sort=price_asc");
  await page.getByRole("link", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.goto("/help");
  await page
    .getByRole("searchbox", { name: "Search help", exact: true })
    .fill("refund");
  await page.getByText("How do I return an item?", { exact: true }).click();
  await expect(page.locator("details[open]")).toContainText("Request return");
  await page.goto("/parts/999999");
  await expect(
    page.getByRole("heading", {
      name: "This page or listing isn’t available",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse parts", exact: true }),
  ).toBeVisible();
});
