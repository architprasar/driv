"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

type HistoryEvent = {
  id: number;
  event_type: string;
  title: string;
  description: string;
  date: string;
  odometer: number;
  location: string;
  tags: string[];
  verified: boolean;
};

type VehicleHistoryResponse = {
  car_title: string;
  vin: string;
  events: HistoryEvent[];
  total_events: number;
  clean_title: boolean | null;
  has_recorded_accident?: boolean;
  metadata?: {
    generated_at?: string;
    verified_events?: number;
    unverified_events?: number;
    sources?: string[];
    has_open_recalls?: boolean;
    last_event_date?: string | null;
  };
};

export default function VehicleHistory({ initialVin }: { initialVin: string }) {
  const router = useRouter();
  const [vinInput, setVinInput] = useState(initialVin);
  const [loading, setLoading] = useState(Boolean(initialVin));
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VehicleHistoryResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      if (!initialVin) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<VehicleHistoryResponse>(`/valuations/history/${encodeURIComponent(initialVin)}/`);
        if (mounted) {
          setHistory(response.data);
        }
      } catch (err: unknown) {
        if (mounted) {
          const responseStatus = typeof err === "object" && err !== null && "response" in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
          if (responseStatus === 404) {
            setError("No report found for this VIN yet.");
          } else {
            setError("Could not load this report right now. Please try again.");
          }
          setHistory(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [initialVin]);

  const accidentCount = useMemo(
    () => history?.events.filter((event) => event.event_type === "accident").length || 0,
    [history]
  );

  const latestMileage = useMemo(() => {
    if (!history || history.events.length === 0) return null;
    return Math.max(...history.events.map((event) => event.odometer || 0));
  }, [history]);

  const onSubmitVin = (event: FormEvent) => {
    event.preventDefault();
    const value = vinInput.trim().toUpperCase();
    if (!value) return;
    router.push(`/history/${encodeURIComponent(value)}`);
  };

  const generatedAt = history?.metadata?.generated_at
    ? new Date(history.metadata.generated_at).toLocaleString()
    : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="bg-surface-container-low rounded-2xl p-6 mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight headline mb-2">Vehicle History Check</h1>
        <p className="text-sm text-on-surface-variant mb-5">
          Run a VIN check before you buy or sell. We compile registration, service, accident, and recall records.
        </p>
        <form onSubmit={onSubmitVin} className="flex flex-col md:flex-row gap-3">
          <input
            value={vinInput}
            onChange={(e) => setVinInput(e.target.value.toUpperCase())}
            placeholder="Enter 17-character VIN"
            className="flex-1 rounded-xl border border-surface-container-high px-4 py-3 bg-white"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold"
          >
            Check VIN
          </button>
        </form>
      </div>

      {loading && (
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-surface-container text-center">
          <p className="font-bold">Loading report for VIN {initialVin}...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-error/20">
          <p className="font-bold text-error mb-2">Report unavailable</p>
          <p className="text-sm text-on-surface-variant mb-4">{error}</p>
          <div className="flex gap-3">
            <button onClick={() => router.refresh()} className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm">
              Retry
            </button>
            <Link href="/help" className="px-4 py-2 rounded-lg bg-surface-container font-bold text-sm">
              Contact Support
            </Link>
          </div>
        </div>
      )}

      {!loading && history && (
        <>
          <div className="mb-5">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${history.clean_title ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {history.has_recorded_accident ? "Recorded incident" : "Title not verified"}
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tighter headline mb-2">{history.car_title}</h2>
          <p className="text-sm text-on-surface-variant mb-6">VIN: {history.vin}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container">
              <p className="text-2xl font-black headline">{history.total_events}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Total Events</p>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container">
              <p className="text-2xl font-black headline">{accidentCount}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Accidents</p>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container">
              <p className="text-2xl font-black headline">{latestMileage?.toLocaleString() || "N/A"}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Latest Odometer</p>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container">
              <p className="text-2xl font-black headline">{history.metadata?.verified_events ?? 0}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Reviewed entries</p>
            </div>
          </div>

          <div className="bg-primary-fixed/20 rounded-2xl p-5 mb-8">
            <p className="text-xs uppercase tracking-widest font-bold mb-1">Trust Notes</p>
            <p className="text-sm text-on-surface-variant">
              {history.metadata?.sources?.join(", ") || "No history sources supplied"}
              {generatedAt ? ` on ${generatedAt}` : ""}.
              {history.metadata?.has_open_recalls ? " Open recall records exist." : " No recall records supplied."}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              This report contains marketplace records only. It does not verify government title, insurance, accident history or recall status. Arrange an independent inspection and document checks before purchase.
            </p>
          </div>

          {history.events.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-surface-container">
              <p className="font-bold mb-2">No timeline records yet</p>
              <p className="text-sm text-on-surface-variant mb-4">
                This VIN exists but we do not have event records yet. You can still proceed with an inspection and seller verification.
              </p>
              <div className="flex gap-3">
                <Link href="/challan" className="px-4 py-2 rounded-lg bg-surface-container font-bold text-sm">Check Challans</Link>
              </div>
            </div>
          ) : (
            <section className="mb-12">
              <h3 className="text-2xl font-extrabold tracking-tighter headline mb-5">Chronological Events</h3>
              <div className="space-y-0">
                {history.events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full shrink-0 ${index === 0 ? "bg-primary" : "bg-surface-container-high"}`} />
                      {index < history.events.length - 1 && <div className="w-0.5 flex-1 bg-surface-container-high" />}
                    </div>
                    <div className="pb-7">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{event.event_type.replace("_", " ")}</p>
                      <h4 className="text-lg font-bold headline mt-1 mb-2">{event.title}</h4>
                      {event.description && <p className="text-sm text-on-surface-variant mb-3">{event.description}</p>}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {event.verified && (
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Verified
                          </span>
                        )}
                        {event.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-bold uppercase tracking-widest bg-surface-container px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-bold">{new Date(event.date).toLocaleDateString()}</p>
                      <p className="text-xs text-on-surface-variant">
                        Odometer: {event.odometer.toLocaleString()} {event.location ? `• ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
