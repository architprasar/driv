"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

type PricingFactor = {
  key: string;
  label: string;
  impact_type: "positive" | "negative" | "neutral";
  amount: string;
  description: string;
};

type ValuationPayload = {
  id: number;
  basis?: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  mileage: number;
  min_value: string;
  max_value: string;
  market_average: string;
  valid_until: string;
  confidence_score?: number;
  confidence_label?: string;
  rationale_summary?: string;
  pricing_factors?: PricingFactor[];
  next_actions?: string[];
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatMoney(value: string) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : currency.format(numeric);
}

function SellDetailsContent() {
  const searchParams = useSearchParams();
  const valuationId = searchParams.get("valuationId");
  const [valuation, setValuation] = useState<ValuationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadValuation = async () => {
      if (!valuationId) {
        setError("No valuation found. Start a valuation to continue.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await apiClient.get(`/valuations/${valuationId}/`);
        if (isMounted) {
          setValuation(response.data);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (isMounted) {
          if (status === 401) {
            setError("Please log in to view your valuation.");
          } else if (status === 404) {
            setError("This valuation could not be found.");
          } else {
            setError("We could not load your valuation right now.");
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadValuation();
    return () => {
      isMounted = false;
    };
  }, [valuationId]);

  const carTitle = useMemo(() => {
    if (!valuation) return "";
    return `${valuation.year} ${valuation.brand} ${valuation.model}${valuation.variant ? ` ${valuation.variant}` : ""}`;
  }, [valuation]);

  return (
    <div className="px-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-primary font-bold text-sm mb-1">STEP 2 OF 3</p>
        <h1 className="text-4xl font-extrabold tracking-tighter headline">Your listing-based estimate</h1>
      </div>

      {isLoading && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30">
          <p className="text-on-surface-variant font-medium">Fetching your valuation...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30">
          <p className="text-error font-semibold mb-5">{error}</p>
          <Link href="/sell" className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold inline-flex">
            Start Valuation Again
          </Link>
        </div>
      )}

      {!isLoading && !error && valuation && (
        <div className="space-y-6 mb-12">
          <section className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 shadow-sm text-center">
            <p className="text-on-surface-variant text-sm mb-2">{carTitle}</p>
            <p className="text-5xl md:text-6xl font-black text-primary headline tracking-tighter">
              {valuation.basis === "listing_comparables" ? `${formatMoney(valuation.min_value)} - ${formatMoney(valuation.max_value)}` : "No supported estimate"}
            </p>
            <p className="text-on-surface-variant mt-4">
              Comparable asking average: <span className="font-bold text-on-surface">{formatMoney(valuation.market_average)}</span>
            </p>
            <p className="text-on-surface-variant mt-1 text-sm">Valid through {valuation.valid_until}</p>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 shadow-sm">
            <h2 className="text-2xl font-extrabold tracking-tighter headline mb-4">Why this price</h2>
            <p className="text-on-surface-variant mb-4">{valuation.rationale_summary || "Review current listings and set your own asking price."}</p>
            {typeof valuation.confidence_score === "number" && (
              <p className="text-sm font-bold mb-5">
                Confidence: {valuation.confidence_score}/100 {valuation.confidence_label ? `(${valuation.confidence_label})` : ""}
              </p>
            )}
            <div className="space-y-3">
              {(valuation.pricing_factors || []).map((factor) => {
                const amountClass = factor.impact_type === "negative" ? "text-error" : factor.impact_type === "positive" ? "text-primary" : "text-on-surface";
                return (
                  <div key={factor.key} className="p-4 rounded-xl bg-surface-container border border-outline-variant/20">
                    <p className="font-bold">{factor.label}</p>
                    <p className={`text-sm font-semibold ${amountClass}`}>{factor.amount}</p>
                    <p className="text-sm text-on-surface-variant">{factor.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-primary-container text-on-primary-container p-8 rounded-2xl">
            <h2 className="text-2xl font-extrabold tracking-tighter headline mb-4">Actionable Next Step</h2>
            <div className="space-y-2 mb-6">
              {(valuation.next_actions || ["Book an inspection to lock your final offer."]).map((action) => (
                <p key={action} className="text-sm">{action}</p>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/cars/new" className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-center">
                Create vehicle listing
              </Link>
              <Link href="/dashboard/auctions" className="bg-surface-container text-on-surface px-6 py-3 rounded-xl font-bold text-center">
                List in Auction
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function SellDetailsPage() {
  return (
    <Suspense fallback={<div className="px-6 max-w-4xl mx-auto py-10 text-sm text-on-surface-variant">Loading...</div>}>
      <SellDetailsContent />
    </Suspense>
  );
}
