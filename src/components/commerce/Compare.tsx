"use client";
import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useResource,
  PageHeader,
  Panel,
  LoadState,
  Empty,
  money,
} from "@/components/workspace/WorkspaceUI";
import "@/components/workspace/workspace.css";
type Car = {
  id: number;
  year: number;
  brand_name: string;
  model_name: string;
  price: string;
  mileage: number;
  fuel_type: string;
  transmission: string;
  engine: string;
  horsepower: number | null;
  drivetrain: string;
  body_type: string;
  color: string;
};
import {
  comparisonSnapshot as getSnapshot,
  subscribeComparison as subscribe,
} from "@/lib/comparison-store";
export default function Compare() {
  const params = useSearchParams();
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  let localIds: number[] = [];
  try {
    localIds = JSON.parse(stored)
      .filter((value: { id?: number }) => typeof value?.id === "number")
      .map((value: { id: number }) => value.id);
  } catch {}
  const ids = (params.get("ids") || localIds.join(","))
    .split(",")
    .filter((value) => /^\d+$/.test(value))
    .slice(0, 4)
    .join(",");
  const { data, error, loading, reload } = useResource<Car[]>(
    `/cars/compare/?ids=${ids}`,
  );
  return (
    <div className="commerce max-w-7xl mx-auto px-5 py-10">
      <PageHeader
        title="Compare vehicles"
        description="Compare current listing details for up to four available vehicles."
        action={
          <Link href="/cars" className="ws-button secondary">
            Choose vehicles
          </Link>
        }
      />
      {loading || error ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : !data?.length ? (
        <div className="ws-panel">
          <Empty
            title="Choose the vehicles you want to compare"
            text="Use the compare checkboxes in the vehicle catalogue, then return here."
            href="/cars"
            action="Explore vehicles"
          />
        </div>
      ) : (
        <Panel title={`${data.length} vehicle${data.length === 1 ? "" : "s"}`}>
          <div className="ws-table-scroll">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Specification</th>
                  {data.map((car) => (
                    <th key={car.id}>
                      <Link href={`/cars/${car.id}`} className="ws-text-link">
                        {car.year} {car.brand_name} {car.model_name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Asking price</td>
                  {data.map((car) => (
                    <td key={car.id} className="ws-number">
                      {money(car.price)}
                    </td>
                  ))}
                </tr>
                {(
                  [
                    ["mileage", "Mileage (km)"],
                    ["fuel_type", "Fuel type"],
                    ["transmission", "Transmission"],
                    ["engine", "Engine"],
                    ["horsepower", "Horsepower"],
                    ["drivetrain", "Drivetrain"],
                    ["body_type", "Body type"],
                    ["color", "Colour"],
                  ] as [keyof Car, string][]
                ).map(([key, title]) => (
                  <tr key={key}>
                    <td>{title}</td>
                    {data.map((car) => (
                      <td key={car.id}>{car[key] || "Not provided"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
