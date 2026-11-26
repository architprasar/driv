import Image from "next/image";
import Link from "next/link";
import { getMediaUrl } from "@/lib/runtime-config";

export type PartSummary = {
  id: number;
  name: string;
  sku: string;
  price: string;
  category_name: string;
  is_genuine: boolean;
  condition: string;
  rating: number | string;
  review_count: number;
  stock: number;
  in_stock: boolean;
  primary_image?: string | null;
  images?: { image: string; is_primary: boolean }[];
};

export function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("engine")) return "settings_input_component";
  if (n.includes("brake")) return "album";
  if (n.includes("suspension")) return "swap_vert";
  if (n.includes("transmission")) return "settings";
  if (n.includes("electric")) return "bolt";
  if (n.includes("wheel") || n.includes("tyre")) return "tire_repair";
  if (n.includes("filter") || n.includes("fluid")) return "water_drop";
  if (n.includes("exterior") || n.includes("interior")) return "airline_seat_recline_normal";
  return "build";
}

const CONDITION: Record<string, string> = {
  new: "New",
  used: "Used",
  refurbished: "Refurbished",
};

export default function PartCard({ part, index = 0 }: { part: PartSummary; index?: number }) {
  const img = part.images?.find((i) => i.is_primary) || part.images?.[0];
  const src = part.primary_image || img?.image;
  const rating = Number(part.rating) || 0;
  const low = part.in_stock && part.stock > 0 && part.stock <= 3;
  return (
    <Link
      href={`/parts/${part.id}`}
      className="pt-card"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="pt-card-media">
        {src ? (
          <Image
            src={getMediaUrl(src)}
            alt={part.name}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="pt-card-img"
          />
        ) : (
          <span className="material-symbols-outlined pt-card-glyph" aria-hidden="true">
            {categoryIcon(part.category_name)}
          </span>
        )}
        <span className={`pt-chip pt-chip-${part.condition}`}>
          {CONDITION[part.condition] ?? part.condition}
        </span>
        {part.is_genuine && <span className="pt-chip pt-chip-oem">OEM</span>}
      </div>
      <div className="pt-card-body">
        <p className="pt-sku">{part.sku}</p>
        <h3>{part.name}</h3>
        <p className="pt-cat">{part.category_name}</p>
        <div className="pt-card-foot">
          <strong>₹{Number(part.price).toLocaleString("en-IN")}</strong>
          <span className={`pt-stock ${part.in_stock ? "" : "out"}`}>
            {!part.in_stock ? "Out of stock" : low ? `Only ${part.stock} left` : "In stock"}
          </span>
        </div>
        {part.review_count > 0 && (
          <p className="pt-rating">
            ★ {rating.toFixed(1)} <span>({part.review_count})</span>
          </p>
        )}
      </div>
    </Link>
  );
}
