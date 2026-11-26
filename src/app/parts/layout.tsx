import { Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./parts.css";

const display = Barlow_Condensed({
  variable: "--pt-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
const mono = IBM_Plex_Mono({
  variable: "--pt-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function PartsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pt ${display.variable} ${mono.variable}`}>{children}</div>;
}
