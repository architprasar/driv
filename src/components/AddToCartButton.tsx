"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { errorMessage } from "@/components/workspace/WorkspaceUI";
export default function AddToCartButton({
  part,
}: {
  part: {
    id: number;
    name: string;
    price: string;
    stock: number;
    image?: string;
    sku: string;
  };
}) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const add = async (buy = false) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiClient.post("/cart/items/", {
        item_id: part.id,
        item_type: "part",
        quantity,
      });
      if (buy) router.push("/checkout");
      else setMessage("Added to your cart.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  if (!part.stock)
    return (
      <p className="rounded-xl bg-slate-100 px-5 py-4 font-bold text-slate-500">
        Out of stock
      </p>
    );
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-4 rounded-lg border border-slate-200 p-1">
        <button
          className="h-10 w-10"
          aria-label="Decrease quantity"
          disabled={loading || quantity <= 1}
          onClick={() => setQuantity(quantity - 1)}
        >
          −
        </button>
        <span className="font-bold">{quantity}</span>
        <button
          className="h-10 w-10"
          aria-label="Increase quantity"
          disabled={loading || quantity >= part.stock}
          onClick={() => setQuantity(quantity + 1)}
        >
          +
        </button>
        <span className="pr-3 text-xs text-slate-500">
          {part.stock} available
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="rounded-xl border-2 border-primary px-4 py-4 font-bold text-primary disabled:opacity-50"
          disabled={loading}
          onClick={() => add()}
        >
          {loading ? "Adding…" : "Add to cart"}
        </button>
        <button
          className="rounded-xl bg-primary px-4 py-4 font-bold text-white disabled:opacity-50"
          disabled={loading}
          onClick={() => add(true)}
        >
          Buy now
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
