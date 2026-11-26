"use client";
import { useState } from "react";
import {
  useResource,
  LoadState,
  Pager,
  date,
} from "@/components/workspace/WorkspaceUI";
type Reviews = {
  count: number;
  next: string | null;
  rating: number | null;
  results: {
    id: number;
    customer_name: string;
    rating: number;
    body: string;
    created_at: string;
  }[];
};
export default function PartReviews({
  partId,
  compatibleBrands = [],
  compatibleModels = [],
}: {
  partId: number;
  compatibleBrands?: string[];
  compatibleModels?: string[];
}) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<Reviews>(
    `/parts/${partId}/reviews/?page=${page}`,
  );
  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-2xl font-bold mb-3">Verified purchase reviews</h2>
      {loading || error ? (
        <LoadState loading={loading} error={error} retry={reload} />
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-6">
            {data?.count
              ? `${Number(data.rating || 0).toFixed(1)} / 5 from ${data.count} verified purchase reviews.`
              : "No verified purchase reviews yet. Customers can review after confirming receipt."}
          </p>
          {data?.results.map((review) => (
            <article key={review.id} className="border-t border-slate-100 py-5">
              <div className="flex justify-between gap-3">
                <strong className="text-sm">{review.customer_name}</strong>
                <span className="text-sm text-amber-600">
                  {review.rating} / 5
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                {review.body}
              </p>
              <small className="text-slate-400">
                Verified purchase · {date(review.created_at)}
              </small>
            </article>
          ))}
          {data && data.count > 20 && (
            <Pager count={data.count} page={page} setPage={setPage} size={20} />
          )}
        </>
      )}
      <div className="mt-7 border-t border-slate-200 pt-6">
        <h3 className="font-bold mb-3">Compatibility supplied by the seller</h3>
        <p className="text-sm text-slate-500">
          {compatibleBrands.length || compatibleModels.length
            ? [...compatibleBrands, ...compatibleModels].join(", ")
            : "No vehicle compatibility details have been provided. Check the part number and ask the seller before purchasing."}
        </p>
      </div>
    </section>
  );
}
