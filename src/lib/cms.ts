import { getApiBaseUrl } from "@/lib/runtime-config";

export type CmsSite = {
  brand_tagline: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  social: Record<"facebook" | "instagram" | "x" | "youtube", string>;
  announcement: { enabled: boolean; text: string; link: string };
};
export type CmsHome = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    image: string | null;
    primary_cta: { label: string; href: string };
    secondary_cta: { label: string; href: string };
  };
  badges: { icon: string; title: string; subtitle: string }[];
  intents: { icon: string; title: string; subtitle: string; href: string }[];
};
export type CmsParts = {
  eyebrow: string;
  title: string;
  description: string;
  promises: { icon: string; title: string; text: string }[];
  seller_cta: { title: string; text: string };
};
export type CmsBlock =
  | { type: "heading"; value: string }
  | { type: "paragraph"; value: string }
  | { type: "image"; value: { url: string; alt: string } }
  | { type: "callout"; value: { title: string; text: string } };
export type CmsPage = {
  title: string;
  slug: string;
  intro: string;
  body: CmsBlock[];
};

// Content is cached for a minute so editors see changes quickly without
// making every page dynamic. Any failure returns null so callers fall back
// to the built-in defaults: the site never breaks because the CMS is down.
async function cms<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/cms/${path}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export const getCmsSite = () => cms<CmsSite>("site/");
export const getCmsHome = () => cms<CmsHome>("home/");
export const getCmsPage = (slug: string) =>
  cms<CmsPage>(`pages/${encodeURIComponent(slug)}/`);
export const getCmsParts = () => cms<CmsParts>("parts/");
