"use client";
import ListingCreate from "@/components/commerce/ListingCreate";
import "@/components/workspace/workspace.css";
export default function PartListingForm(_props: { categories: unknown[] }) {
  void _props;
  return (
    <div className="commerce">
      <ListingCreate type="parts" />
    </div>
  );
}
