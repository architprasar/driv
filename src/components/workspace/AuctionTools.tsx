"use client";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import {
  Modal,
  Icon,
  useResource,
  LoadState,
  errorMessage,
  type PageData,
} from "./WorkspaceUI";
type Vehicle = {
  id: number;
  year: number;
  brand_name: string;
  model_name: string;
  has_auction: boolean;
  status: string;
};
export function CreateAuction({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="ws-button" onClick={() => setOpen(true)}>
        <Icon name="add" />
        Create auction
      </button>
      {open && (
        <AuctionForm onClose={() => setOpen(false)} onChange={onChange} />
      )}
    </>
  );
}
function AuctionForm({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange: () => void;
}) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<PageData<Vehicle>>(
    `/dashboard/workspace/cars/?page_size=50&page=${page}`,
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setFormError("");
    try {
      await apiClient.post("/auctions/", {
        car: Number(form.get("car")),
        lot_number: form.get("lot_number"),
        starting_bid: form.get("starting_bid"),
        reserve_price: form.get("reserve_price"),
        min_increment: form.get("min_increment"),
        start_time: new Date(String(form.get("start_time"))).toISOString(),
        end_time: new Date(String(form.get("end_time"))).toISOString(),
      });
      onChange();
      onClose();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Create auction"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="ws-form" onSubmit={save}>
        {formError && (
          <div className="ws-notice error" role="alert">
            {formError}
          </div>
        )}
        {loading || error ? (
          <LoadState loading={loading} error={error} retry={reload} />
        ) : (
          <>
            <div className="ws-form-grid">
              <label className="ws-field full">
                Vehicle
                <select
                  name="car"
                  aria-label="Vehicle"
                  aria-describedby="auction-vehicle-hint"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a vehicle
                  </option>
                  {data?.results
                    .filter(
                      (car) =>
                        !car.has_auction &&
                        !["sold", "archived"].includes(car.status),
                    )
                    .map((car) => (
                      <option value={car.id} key={car.id}>
                        {car.year} {car.brand_name} {car.model_name}
                      </option>
                    ))}
                </select>
                <small id="auction-vehicle-hint">
                  Only your vehicles without an existing auction can be
                  selected.
                </small>
              </label>
              {Boolean(data?.next || page > 1) && (
                <div className="ws-row-actions">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous vehicles
                  </button>
                  <button
                    type="button"
                    disabled={!data?.next}
                    onClick={() => setPage(page + 1)}
                  >
                    More vehicles
                  </button>
                </div>
              )}
              <label className="ws-field full">
                Lot number
                <input
                  name="lot_number"
                  required
                  maxLength={20}
                  placeholder="e.g. DRV-2026-001"
                />
              </label>
              <label className="ws-field">
                Starting bid (INR)
                <input
                  type="number"
                  name="starting_bid"
                  min="1"
                  step="0.01"
                  required
                />
              </label>
              <label className="ws-field">
                Reserve price (INR)
                <input
                  type="number"
                  name="reserve_price"
                  min="1"
                  step="0.01"
                  required
                />
              </label>
              <label className="ws-field full">
                Minimum bid increment (INR)
                <input
                  type="number"
                  name="min_increment"
                  min="1"
                  step="0.01"
                  defaultValue={100}
                  required
                />
              </label>
              <label className="ws-field">
                Starts at
                <input type="datetime-local" name="start_time" required />
              </label>
              <label className="ws-field">
                Closes at
                <input type="datetime-local" name="end_time" required />
              </label>
            </div>
            <p>
              Times use your local time zone. Start the auction from your
              dashboard when its bidding window opens.
            </p>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                type="button"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
              <button className="ws-button" disabled={busy}>
                {busy ? "Creating…" : "Create auction"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
export function AuctionControls({
  id,
  status,
  onChange,
}: {
  id: number;
  status: string;
  onChange: () => void;
}) {
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const execute = async () => {
    setBusy(true);
    setError("");
    try {
      await apiClient.post(
        `/auctions/${id}/${action}/`,
        action === "extend" ? { minutes: 15 } : {},
      );
      setAction("");
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {status === "upcoming" && (
        <button
          onClick={() => {
            setAction("start");
            setError("");
          }}
        >
          Start
        </button>
      )}
      {status === "live" && (
        <>
          <button
            onClick={() => {
              setAction("extend");
              setError("");
            }}
          >
            Extend
          </button>
          <button
            onClick={() => {
              setAction("close");
              setError("");
            }}
          >
            Close
          </button>
        </>
      )}
      {action && (
        <Modal
          title={
            action === "start"
              ? "Start auction?"
              : action === "extend"
                ? "Extend auction?"
                : "Close auction?"
          }
          onClose={() => {
            if (!busy) setAction("");
          }}
        >
          <div className="ws-form">
            {error && (
              <div className="ws-notice error" role="alert">
                {error}
              </div>
            )}
            <p>
              {action === "start"
                ? "Open bidding for this lot. The current time must fall within its scheduled bidding window."
                : action === "extend"
                  ? "Add 15 minutes to the current auction closing time."
                  : "End bidding now. If the reserve is met and there is a winning bidder, an order will be created for them."}
            </p>
            <div className="ws-form-actions">
              <button
                className="ws-button secondary"
                disabled={busy}
                onClick={() => setAction("")}
              >
                Cancel
              </button>
              <button className="ws-button" disabled={busy} onClick={execute}>
                {busy ? "Updating…" : "Confirm"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
