import VehicleHistory from "@/components/VehicleHistory";

export default async function VehicleHistoryPage({ params }: { params: Promise<{ vin: string }> }) {
  const { vin } = await params;
  return <VehicleHistory initialVin={decodeURIComponent(vin || "").toUpperCase()} />;
}
