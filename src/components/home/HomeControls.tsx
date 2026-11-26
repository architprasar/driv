"use client";
import CitySelector from "@/components/CitySelector";

import Image from "next/image";
import Link from "next/link";
import HomeSelect from "./HomeSelect";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMediaUrl } from "@/lib/runtime-config";
import { Action, Icon, Photo, SectionHeading } from "./HomePrimitives";
import type { HomeCar } from "./types";

const models: Record<string, string[]> = {
  Maruti: ["Swift", "Baleno", "Grand Vitara"],
  Hyundai: ["Creta", "i20", "Venue"],
  Tata: ["Nexon", "Harrier", "Tiago"],
  Honda: ["City", "Amaze"],
  Mahindra: ["XUV700", "Scorpio", "Thar"],
  Toyota: ["Fortuner", "Innova"],
};
export function HomeSearch() {
  const [tab, setTab] = useState("Buy Car");
  const [brand, setBrand] = useState("");
  const router = useRouter();
  return (
    <section
      className="home-search-panel home-search-redesign"
      aria-label="Find your next car"
    >
      <div className="home-search-top">
        <div
          className="home-search-tabs"
          role="tablist"
          aria-label="Marketplace category"
        >
          {[
            ["directions_car", "Buy Car"],
            ["directions_car", "Used Cars"],
            ["gavel", "Auctions"],
            ["settings", "Parts"],
          ].map(([icon, label]) => (
            <button
              key={label}
              id={`home-tab-${label.replaceAll(" ", "-")}`}
              aria-controls="home-search-fields"
              type="button"
              role="tab"
              aria-selected={tab === label}
              className={tab === label ? "active" : ""}
              onClick={() => setTab(label)}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </div>
        <CitySelector className="search-panel-city" />
      </div>
      <form
        id="home-search-fields"
        role="tabpanel"
        aria-labelledby={`home-tab-${tab.replaceAll(" ", "-")}`}
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const params = new URLSearchParams();
          const query = [fields.get("brand"), fields.get("model")]
            .filter(Boolean)
            .join(" ");
          if (query) params.set("search", query);
          if (fields.get("max_price"))
            params.set("max_price", String(fields.get("max_price")));
          if (fields.get("city"))
            params.set(
              tab === "Auctions" ? "location" : "city",
              String(fields.get("city")),
            );
          router.push(
            `${tab === "Auctions" ? "/auctions" : tab === "Parts" ? "/parts/list" : "/cars"}?${params}`,
          );
        }}
      >
        <label>
          <Icon name="directions_car" />
          <HomeSelect
            hint="e.g. Maruti, Hyundai"
            aria-label="Brand"
            name="brand"
            value={brand}
            onValueChange={setBrand}
          >
            <option value="">Select Brand</option>
            {Object.keys(models).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </HomeSelect>
        </label>
        <label>
          <Icon name="description" />
          <HomeSelect
            key={brand}
            hint="e.g. Swift, Creta"
            aria-label="Model"
            name="model"
          >
            <option value="">Select Model</option>
            {(models[brand] || []).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </HomeSelect>
        </label>
        <label>
          <Icon name="currency_rupee" />
          <HomeSelect hint="Any budget" aria-label="Budget" name="max_price">
            <option value="">Budget (₹)</option>
            <option value="500000">Under ₹5 Lakh</option>
            <option value="1000000">Under ₹10 Lakh</option>
            <option value="2000000">Under ₹20 Lakh</option>
            <option value="3000000">Under ₹30 Lakh</option>
          </HomeSelect>
        </label>
        <label>
          <Icon name="location_on" />
          <HomeSelect heading="Location" name="city" aria-label="Location">
            <option value="Bangalore">Bengaluru</option>
            {["Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune"].map(
              (city) => (
                <option key={city}>{city}</option>
              ),
            )}
            <option value="">All India</option>
          </HomeSelect>
        </label>
        <button className="home-button">
          <Icon name="search" />
          Search{" "}
          {tab === "Parts" ? "Parts" : tab === "Auctions" ? "Auctions" : "Cars"}
          <Icon name="arrow_forward" />
        </button>
      </form>
      <Link
        className="home-advanced-search"
        href={
          tab === "Parts"
            ? "/parts/list"
            : tab === "Auctions"
              ? "/auctions"
              : "/cars"
        }
      >
        <Icon name="tune" />
        Advanced Search
      </Link>
    </section>
  );
}

export function RecommendedCars({
  cars,
  unavailable,
}: {
  cars: HomeCar[];
  unavailable: boolean;
}) {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const inventory = cars;
  const visible = inventory
    .filter(
      (car) =>
        filter === "All" ||
        (filter === "Under ₹10L" && Number(car.price) < 1000000) ||
        (filter === "SUV" && car.body_type?.toLowerCase() === "suv") ||
        (filter === "Automatic" &&
          car.transmission?.toLowerCase() === "automatic") ||
        (filter === "Low KM" && Number(car.mileage) < 30000),
    )
    .slice(0, 4);
  const picked = inventory.filter((car) => selected.includes(car.id));
  return (
    <section className="home-recommended">
      <div className="recommend-heading">
        <SectionHeading
          title="Available vehicles"
          subtitle="Explore available listings and review each vehicle’s condition and records."
        />
        <div className="home-filter-chips">
          {["All", "Under ₹10L", "SUV", "Automatic", "Low KM"].map((label) => (
            <button
              key={label}
              aria-pressed={filter === label}
              className={filter === label ? "active" : ""}
              onClick={() => setFilter(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href="/cars" className="home-view-link">
          View All Cars
          <Icon name="arrow_forward" />
        </Link>
      </div>
      {unavailable && (
        <p className="home-data-note" role="status">
          Live inventory is temporarily unavailable. Open the catalogue to try
          again.
        </p>
      )}
      <div className="home-car-grid">
        {visible.map((car) => (
          <article className="home-car-card" key={car.id}>
            <div className="car-image">
              {car.id < 0 ? (
                <Photo
                  source={2}
                  crop={[62 + (-car.id - 1) * 369, 636, 350, 150]}
                  alt={`${car.brand_name} ${car.model_name}`}
                />
              ) : car.primary_image?.image ? (
                <Image
                  src={getMediaUrl(car.primary_image.image)}
                  alt={`${car.brand_name} ${car.model_name}`}
                  fill
                  sizes="(max-width: 600px) 100vw, 25vw"
                />
              ) : (
                <Icon name="directions_car" />
              )}
              {(car.is_assured || car.id < 0) && (
                <span className="car-assured">
                  <Icon name="verified" />
                  {car.id < 0 ? "PREVIEW" : "ASSURED"}
                </span>
              )}
              <Link
                href="/saved"
                aria-label="View saved cars"
                className="car-heart"
              >
                <Icon name="favorite" />
              </Link>
            </div>
            <div className="car-details">
              <div className="car-title-row">
                <div>
                  <p>
                    {car.year} · {car.brand_name}
                  </p>
                  <h3>{car.model_name}</h3>
                </div>
              </div>
              <strong className="car-price">
                ₹ {Number(car.price).toLocaleString("en-IN")}
              </strong>
              <div className="car-specs">
                <span>
                  <Icon name="speed" />
                  {Number(car.mileage || 0).toLocaleString("en-IN")} km
                </span>
                <span>
                  <Icon name="local_gas_station" />
                  {car.fuel_type || "—"}
                </span>
                <span>
                  <Icon name="settings" />
                  {car.transmission || "—"}
                </span>
              </div>
              <div className="car-card-actions">
                <Link href={car.id < 0 ? "/cars" : `/cars/${car.id}`}>
                  View Details
                  <Icon name="arrow_forward" />
                </Link>
                <button
                  aria-label={`${selected.includes(car.id) ? "Remove" : "Add"} ${car.model_name} ${selected.includes(car.id) ? "from" : "to"} comparison`}
                  aria-pressed={selected.includes(car.id)}
                  onClick={() =>
                    setSelected((previous) =>
                      previous.includes(car.id)
                        ? previous.filter((id) => id !== car.id)
                        : previous.length < 4
                          ? [...previous, car.id]
                          : previous,
                    )
                  }
                >
                  <Icon
                    name={
                      selected.includes(car.id) ? "check" : "compare_arrows"
                    }
                  />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="home-empty">
          No cars match these filters. <Link href="/cars">Browse all cars</Link>
        </div>
      )}
      <div className="home-compare">
        <span className="compare-icon">
          <Icon name="balance" />
        </span>
        <div>
          <h3>Compare Cars</h3>
          <p>Add up to 4 cars to compare specifications</p>
        </div>
        <div className="compare-picks">
          {picked.map((car) => (
            <button
              key={car.id}
              onClick={() =>
                setSelected((previous) =>
                  previous.filter((id) => id !== car.id),
                )
              }
              aria-label={`Remove ${car.model_name}`}
            >
              <Icon name="directions_car" />
              {car.model_name}
              <Icon name="close" />
            </button>
          ))}
          {picked.length < 4 && (
            <a href="#home-search-fields">
              <Icon name="add" />
              Add Car
            </a>
          )}
        </div>
        <button
          className="home-button"
          disabled={picked.length < 2}
          onClick={() => setComparisonOpen(true)}
        >
          Compare Cars
          <Icon name="arrow_forward" />
        </button>
      </div>
      {comparisonOpen && (
        <div className="home-comparison-result">
          <div className="home-section-heading">
            <h3>Car comparison{unavailable ? " · Preview" : ""}</h3>
            <button
              aria-label="Close comparison"
              onClick={() => setComparisonOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Specification</th>
                  {picked.map((car) => (
                    <th key={car.id}>
                      {car.brand_name} {car.model_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Year", "year"],
                    ["Price (₹)", "price"],
                    ["Mileage (km)", "mileage"],
                    ["Fuel", "fuel_type"],
                    ["Transmission", "transmission"],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <th>{label}</th>
                    {picked.map((car) => (
                      <td key={car.id}>{car[key] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function SellingAndFinance() {
  return (
    <>
      <section className="home-selling-finance">
        <div className="home-selling">
          <h2>List your vehicle. Follow your sale.</h2>
          <p className="panel-subtitle">
            A simple, transparent way to sell your car.
          </p>
          <div className="selling-content">
            <Photo
              source={4}
              crop={[18, 201, 425, 436]}
              alt="Happy car seller with his silver SUV"
            />
            <div className="selling-steps">
              {[
                [
                  "description",
                  "Get instant valuation",
                  "Review available asking-price comparables",
                ],
                [
                  "directions_car",
                  "Prepare your listing",
                  "Upload details, history and photos",
                ],
                [
                  "currency_rupee",
                  "Follow payment and handover",
                  "Track the saved order in your workspace",
                ],
              ].map(([icon, title, subtitle], index) => (
                <div className="selling-step" key={title}>
                  <Icon name={icon} />
                  <b>{index + 1}</b>
                  <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                  </div>
                </div>
              ))}
              <div className="home-valuation">
                <h3>Start your vehicle listing</h3>
                <p>Add accurate details, photos and your asking price.</p>
                <Action href="/dashboard/cars/new">Create listing</Action>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="home-benefits">
        <SectionHeading
          title="Why customers choose us"
          subtitle="A trusted platform. A better car buying & selling experience."
        />
        <div>
          {[
            [
              "sell",
              "Transparent Pricing",
              "Review the final price, tax and delivery quote.",
            ],
            [
              "home",
              "Seller communication",
              "Ask questions and arrange collection with your seller.",
            ],
            [
              "verified_user",
              "Secure Payment",
              "Follow provider payment and refund records.",
            ],
            [
              "headset_mic",
              "Dedicated Support",
              "Keep support conversations in your account.",
            ],
          ].map(([icon, title, text]) => (
            <article key={title}>
              <span>
                <Icon name={icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
