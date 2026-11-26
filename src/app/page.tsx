import { serverFetch } from "@/lib/api-server";
import { HomeHero, Discovery, PartsAndServices, HomeTrust } from "@/components/home/HomeSections";
import { HomeSearch, RecommendedCars, SellingAndFinance } from "@/components/home/HomeControls";
import { HomeAuctions } from "@/components/home/HomeAuctions";
import type { HomeCar, HomeAuction } from "@/components/home/types";
import HomeScrollMotion from "@/components/home/HomeScrollMotion";
import { getCmsHome } from "@/lib/cms";
import "./home.css";

async function homeData<T>(endpoint: string): Promise<{ items: T[]; unavailable: boolean }> {
  try {
    const response = await serverFetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data = await response.json();
    return { items: Array.isArray(data) ? data : data.results || [], unavailable: false };
  } catch {
    return { items: [], unavailable: true };
  }
}

export default async function Home() {
  const [cars, auctions, cms] = await Promise.all([homeData<HomeCar>("/cars/"), homeData<HomeAuction>("/auctions/"), getCmsHome()]);
  return (
    <div className="drivio-home">
      <HomeScrollMotion />
      <HomeHero cms={cms} />
      <div className="home-container"><HomeSearch /><Discovery cms={cms} /><RecommendedCars cars={cars.items} unavailable={cars.unavailable} /></div>
      <HomeAuctions auctions={auctions.items} unavailable={auctions.unavailable} />
      <div className="home-container"><PartsAndServices /><SellingAndFinance /></div>
      <HomeTrust />
    </div>
  );
}
