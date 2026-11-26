"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/runtime-config";
import {
  PageHeader,
  Panel,
  LoadState,
  Empty,
  Pager,
  Badge,
  Icon,
  useResource,
  money,
  errorMessage,
  type PageData,
} from "@/components/workspace/WorkspaceUI";
type Car = {
  id: number;
  year: number;
  brand_name: string;
  model_name: string;
  price: string;
  status: string;
  primary_image: { image: string } | null;
};
export default function Favorites() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource<PageData<Car>>(
    `/cars/saved/?page=${page}`,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const remove = async (id: number) => {
    setBusy(true);
    try {
      await apiClient.delete(`/cars/${id}/save/`);
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Saved vehicles"
        description="Return to the vehicles you have saved to your account."
      />
      {message && (
        <div className="ws-notice error" role="alert">
          {message}
        </div>
      )}
      <Panel title="Your saved vehicles">
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : !data?.results.length ? (
          <Empty
            icon="bookmark"
            title="Keep your favourites close"
            text="Save a vehicle from its details page to find it here."
            href="/cars"
            action="Explore vehicles"
          />
        ) : (
          <div className="ws-table-scroll">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.results.map((car) => (
                  <tr key={car.id}>
                    <td>
                      <Link href={`/cars/${car.id}`} className="ws-item">
                        <span className="ws-item-image">
                          {car.primary_image?.image ? (
                            <Image
                              src={getMediaUrl(car.primary_image.image)}
                              alt=""
                              fill
                              sizes="72px"
                            />
                          ) : (
                            <Icon name="directions_car" />
                          )}
                        </span>
                        <strong>
                          {car.year} {car.brand_name} {car.model_name}
                        </strong>
                      </Link>
                    </td>
                    <td className="ws-number">{money(car.price)}</td>
                    <td>
                      <Badge value={car.status} />
                    </td>
                    <td>
                      <button
                        className="ws-text-link"
                        disabled={busy}
                        onClick={() => remove(car.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && !loading && !error && (
          <Pager count={data.count} page={page} setPage={setPage} />
        )}
      </Panel>
    </>
  );
}
