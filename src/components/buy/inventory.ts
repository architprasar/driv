export type InventoryCar = {
  id: number; brand_name: string; model_name: string; variant?: string; year: number;
  price: string | number; mileage: number; fuel_type: string; transmission: string;
  condition: string; location: string; is_featured: boolean;
  primary_image?: { image: string } | null;
};
export type Brand = { id: number; name: string; slug: string };
export type InventoryResponse = { results: InventoryCar[]; count: number; next: string | null };
export const cities = ["Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"];
export const cityLabel = (city: string) => city === "Bangalore" ? "Bengaluru" : city || "All India";
export const bodyTypes = [["suv", "SUV"], ["hatchback", "Hatchback"], ["sedan", "Sedan"], ["coupe", "Coupe"], ["truck", "Truck"], ["convertible", "Convertible"]];
export const fuels = [["petrol", "Petrol"], ["diesel", "Diesel"], ["electric", "Electric"], ["hybrid", "Hybrid"]];
export const allowedParams = new Set(["sort", "ordering", "search", "min_price", "max_price", "year_min", "year_max", "brand", "model", "fuel_type", "transmission", "body_type", "condition", "status", "is_featured", "page", "city"]);
export function inventoryQuery(input: Record<string, string | string[] | undefined>, cookieCity?: string) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, raw]) => {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!allowedParams.has(key) || !value) return;
    params.set(key, ["body_type", "fuel_type", "transmission"].includes(key) ? value.toLowerCase() : value);
  });
  if (!Object.hasOwn(input, "city") && cookieCity && cookieCity !== "All Cities") params.set("city", cookieCity);
  if (params.get("city") === "Bengaluru") params.set("city", "Bangalore");
  if (params.get("city") === "all") params.delete("city");
  return params;
}
