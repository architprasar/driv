import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/home/HomePrimitives";
import { BuyHeroSearch } from "./BuyFilters";

export function BuyPhoto({ source, crop, alt, className = "" }: { source: "body-types" | "selling"; crop: [number, number, number, number]; alt: string; className?: string }) {
  const [x, y, width, height] = crop;
  const style = { aspectRatio: `${width}/${height}`, "--buy-photo-width": `${1586 / width * 100}%`, "--buy-photo-left": `${-x / width * 100}%`, "--buy-photo-top": `${-y / width * 100}cqw` } as CSSProperties;
  return <div className={`buy-photo ${className}`} style={style}><Image src={`/buy/${source}-reference.png`} alt={alt} width={1586} height={992} sizes="(max-width: 640px) 50vw, 25vw" /></div>;
}

function BuyHeroArtwork() {
  return <>
    <div className="buy-hero-art">
      <Image src="/buy/hero-creta-reference.png" alt="Blue Hyundai Creta at a stone-clad showroom with Drive a Better Tomorrow lettering" fill priority sizes="(max-width: 900px) 100vw, 56vw" />
    </div>
    <div className="buy-hero-promos" aria-label="Illustrative vehicle offer">
      <span className="buy-hero-assured"><Icon name="check_circle" />EXPLORE</span>
      <div className="buy-hero-offer buy-hero-from"><span>From</span><strong>₹8,75 Lakh</strong></div>
      <div className="buy-hero-offer buy-hero-emi"><span>EMI from</span><strong>₹15,012<small>/mo</small></strong></div>
      <small className="buy-hero-offer-note">Illustrative offer. Price and finance terms vary.</small>
    </div>
  </>;
}

export function BuyHero({ query, city }: { query: string; city: string }) {
  return <><section className="buy-hero"><BuyHeroArtwork /><div className="buy-container buy-hero-content"><p className="buy-eyebrow">YOUR NEXT CAR. YOUR CHOICE.</p><h1>Find a car that fits your life.</h1><p className="buy-hero-subtitle">Compare vehicle details, review records and ask sellers before buying.</p><BuyHeroSearch query={query} city={city} /><div className="buy-hero-trust">{[["check", "Review condition"], ["description", "Check documents"], ["undo", "View sale terms"]].map(([icon, title]) => <span key={title}><Icon name={icon} />{title}</span>)}</div></div></section><section className="buy-body-types buy-container"><div className="buy-section-heading"><h2>Browse by body type</h2><Link href="#buy-results">View all <Icon name="arrow_forward" /></Link></div><div className="buy-body-grid">{[["SUV", "body_type=suv"], ["Hatchback", "body_type=hatchback"], ["Sedan", "body_type=sedan"], ["Family cars", "search=Innova"], ["Electric", "fuel_type=electric"], ["Mercedes-Benz", "search=Mercedes"]].map(([label, filter], index) => <Link href={`/cars?${filter}#buy-results`} key={label}><BuyPhoto source="body-types" crop={[48 + index * 252, 703, 224, 108]} alt={`${label} car`} /><div><h3>{label}</h3><span>Explore cars <Icon name="arrow_forward" /></span></div></Link>)}</div></section></>;
}

const trustStats = [["directions_car", "Browse", "Vehicle listings"], ["location_on", "Compare", "Vehicle details"], ["groups", "Contact", "Listing sellers"], ["star", "Track", "Saved orders"]];
export function BuySellBanner() {
  return <><section className="buy-sell-banner buy-container"><BuyPhoto source="selling" crop={[989, 200, 550, 347]} alt="A DrivioCars specialist helping a car owner with an inspection" /><div className="buy-sell-copy"><p className="buy-eyebrow">SELLER WORKSPACE</p><h2>Selling your car? Start your listing.</h2><p>Add accurate details, manage enquiries and follow payment and handover.</p><div className="buy-sell-benefits">{[["construction", "Listing photos", "Show your vehicle"], ["shield", "Review charges", "Check your quote"], ["account_balance_wallet", "Track Payment", "Follow settlement status"]].map(([icon, title, text]) => <div key={title}><Icon name={icon} /><span><strong>{title}</strong><small>{text}</small></span></div>)}</div><Link href="/sell" className="buy-button">Create your listing <Icon name="arrow_forward" /></Link></div></section><section className="buy-stats"><div className="buy-container">{trustStats.map(([icon, value, label]) => <div key={label}><Icon name={icon} /><p><strong>{value}</strong><span>{label}</span></p></div>)}</div></section></>;
}
