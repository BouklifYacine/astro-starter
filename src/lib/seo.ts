import { site } from "../config/site.config";
import { absoluteUrl } from "./site-url";

export interface SeoInput {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  type?: "website" | "article";
  image?: string;
}

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
  type: "website" | "article";
  image: string;
}

function pathValue(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path.endsWith("/") ? path : `${path}/`;
}

export function buildSeo(input: SeoInput = {}): SeoData {
  const path = pathValue(input.path ?? "/");
  const titleText = input.title?.trim() || site.seo.defaultTitle;
  const title = site.seo.titleTemplate.includes("%s")
    ? site.seo.titleTemplate.replace("%s", titleText)
    : `${titleText} | ${site.name}`;
  return {
    title,
    description: input.description?.trim() || site.seo.defaultDescription,
    canonical: absoluteUrl(path),
    noindex: input.noindex ?? site.seo.noindexPaths.includes(path),
    type: input.type ?? "website",
    image: input.image ?? site.seo.ogImage,
  };
}
