import AuctionCatalogue from "@/components/commerce/AuctionCatalogue";
export const metadata={title:"Vehicle auctions | DrivioCars"};
export default async function Page({searchParams}:{searchParams:Promise<{status?:string}>}){const{status}=await searchParams;return <AuctionCatalogue initialStatus={status}/>;}
