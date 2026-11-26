import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}
export function Action({ href, children, light = false, className = "" }: { href: string; children: ReactNode; light?: boolean; className?: string }) {
  return <Link href={href} className={`home-button ${light ? "light" : ""} ${className}`}>{children}<Icon name="arrow_forward" /></Link>;
}
// Display photographic regions only; page text and controls remain native HTML.
export function Photo({ source, crop, alt, className = "", priority = false }: { source: number; crop: [number, number, number, number]; alt: string; className?: string; priority?: boolean }) {
  const [x, y, width, height] = crop;
  const style = { aspectRatio: `${width}/${height}`, "--photo-width": `${1586 / width * 100}%`, "--photo-left": `${-x / width * 100}%`, "--photo-top": `${-y / width * 100}cqw` } as CSSProperties;
  return <div className={`home-photo ${className}`} style={style}><Image src={`/home/reference-${source}.png`} alt={alt} width={1586} height={992} sizes="100vw" priority={priority} /></div>;
}
export function SectionHeading({ title, subtitle, href, link = "View All" }: { title: string; subtitle?: string; href?: string; link?: string }) {
  return <div className="home-section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{href && <Link href={href}>{link}<Icon name="arrow_forward" /></Link>}</div>;
}
