import { cookies } from "next/headers";
import { serverFetch } from "@/lib/api-server";
import { BuyHero, BuySellBanner } from "@/components/buy/BuyCarVisuals";
import BuyInventory from "@/components/buy/BuyInventory";
import {
  inventoryQuery,
  type Brand,
  type InventoryResponse,
} from "@/components/buy/inventory";
import "./buy.css";
import "./buy-hero.css";

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = inventoryQuery(
    await searchParams,
    (await cookies()).get("selected_city")?.value,
  );
  const query = params.toString();
  const [inventory, brands] = await Promise.all([
    (async (): Promise<{ initial: InventoryResponse; error: boolean }> => {
      try {
        const response = await serverFetch(`/cars/?${query}`, {
          signal: AbortSignal.timeout(10000),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Inventory unavailable");
        const data = await response.json();
        const initial: InventoryResponse = Array.isArray(data)
          ? { results: data, count: data.length, next: null }
          : data;
        if (!Array.isArray(initial.results))
          throw new Error("Invalid inventory response");
        return { initial, error: false };
      } catch {
        return { initial: { results: [], count: 0, next: null }, error: true };
      }
    })(),
    (async (): Promise<Brand[]> => {
      try {
        const response = await serverFetch("/cars/brands/", {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : data.results || [];
      } catch {
        return [];
      }
    })(),
  ]);
  const { initial, error } = inventory;
  return (
    <div className="buy-page">
      <BuyHero key={query} query={query} city={params.get("city") || ""} />
      <BuyInventory
        key={
          query +
          ":" +
          error +
          ":" +
          initial.results.map((car) => car.id).join(",")
        }
        query={query}
        initial={initial}
        brands={brands}
        error={error}
      />
      <BuySellBanner />
    </div>
  );
}
