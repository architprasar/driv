"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getMediaUrl } from "@/lib/runtime-config";
import { Icon } from "@/components/home/HomePrimitives";
import { cityLabel, type InventoryCar } from "./inventory";

export function VehicleImage({ car }: { car: InventoryCar }) {
  const [failed, setFailed] = useState(false);
  return car.primary_image?.image && !failed ? <Image src={getMediaUrl(car.primary_image.image)} alt={`${car.brand_name} ${car.model_name}`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 25vw" onError={() => setFailed(true)} /> : <div className="buy-image-fallback"><Icon name="directions_car" /><span>Photo coming soon</span></div>;
}

export default function BuyVehicleCard({ car, compared, saved, toggleCompare, toggleSaved }: { car: InventoryCar; compared: boolean; saved: boolean; toggleCompare: () => void; toggleSaved: () => void }) {
  return <article className="buy-vehicle-card"><div className="buy-vehicle-photo"><Link href={`/cars/${car.id}`} aria-label={`View ${car.brand_name} ${car.model_name}`}><VehicleImage car={car} /></Link>{car.is_featured && <span className="buy-card-badge"><Icon name="star" />TOP PICK</span>}<button className={`buy-save-car ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Unsave" : "Save"} ${car.model_name} to your account`} aria-pressed={saved} onClick={toggleSaved}><Icon name="favorite" /></button></div><div className="buy-vehicle-info"><label className="buy-compare-check"><input type="checkbox" checked={compared} onChange={toggleCompare} />Compare</label><p className="buy-vehicle-year">{car.year} · {car.brand_name}</p><Link href={`/cars/${car.id}`}><h3>{car.model_name} {car.variant}</h3></Link><p className="buy-vehicle-location"><Icon name="location_on" />{cityLabel(car.location)}{car.condition && <span><Icon name="verified_user" />{car.condition.replaceAll("_", " ")}</span>}</p><div className="buy-specs"><span>{Number(car.mileage).toLocaleString("en-IN")} Km</span><span>{car.fuel_type}</span><span>{car.transmission}</span></div><div className="buy-price-row"><div><strong>₹{Number(car.price).toLocaleString("en-IN")}</strong></div><Link href={`/cars/${car.id}`} className="buy-button">View Details<Icon name="arrow_forward" /></Link></div></div></article>;
}
