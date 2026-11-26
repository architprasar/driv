import { serverFetch } from "@/lib/api-server";
import { notFound } from "next/navigation";
import LiveAuctionClient from "./LiveAuctionClient";

export default async function AuctionDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const res = await serverFetch(`/auctions/${resolvedParams.id}/`);
  
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error("Auction details are temporarily unavailable.");
  
  const auction = await res.json();

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-96 bg-surface-container-lowest -z-10" />
      <div className="pt-8 relative z-10">
        <LiveAuctionClient initialAuction={auction} />
      </div>
    </>
  );
}
