"use client";
import { usePathname } from "next/navigation";
import { HomeHeader, HomeFooter } from "@/components/home/HomeSections";
import type { CmsSite } from "@/lib/cms";
import BottomNav from "@/components/BottomNav";
export default function SiteChrome({
  position,
  site,
}: {
  position: "header" | "footer";
  site: CmsSite | null;
}) {
  const path = usePathname();
  if (
    ["/profile", "/dashboard", "/vendor/dashboard"].some(
      (base) => path === base || path.startsWith(base + "/"),
    )
  )
    return null;
  return position === "header" ? (
    <div className="drivio-home site-header">
      {site?.announcement.enabled && (
        <div className="cms-announcement" role="note">
          {site.announcement.link ? (
            <a href={site.announcement.link}>{site.announcement.text}</a>
          ) : (
            site.announcement.text
          )}
        </div>
      )}
      <HomeHeader />
    </div>
  ) : (
    <>
      <div className="drivio-home site-footer">
        <HomeFooter site={site} />
      </div>
      <BottomNav />
    </>
  );
}
