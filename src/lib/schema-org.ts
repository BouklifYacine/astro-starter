import { site } from "../config/site.config";
import { absoluteUrl, getSiteUrl } from "./site-url";

type SchemaNode = Record<string, unknown>;

export function organizationSchema(): SchemaNode {
  return {
    "@type": "Organization",
    "@id": `${getSiteUrl().href}#organization`,
    name: site.legalName,
    url: getSiteUrl().href,
    email: site.legal.email,
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(site.legal.address ? { address: site.legal.address } : {}),
  };
}

export function localBusinessSchema(): SchemaNode {
  return {
    ...organizationSchema(),
    "@type": "LocalBusiness",
    name: site.name,
  };
}

export function websiteSchema(): SchemaNode {
  return {
    "@type": "WebSite",
    "@id": `${getSiteUrl().href}#website`,
    name: site.name,
    url: getSiteUrl().href,
    inLanguage: site.lang,
  };
}

export function articleSchema(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: Date;
  updatedAt?: Date;
  image?: string;
}): SchemaNode {
  return {
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.publishedAt.toISOString(),
    ...(input.updatedAt ? { dateModified: input.updatedAt.toISOString() } : {}),
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    author: { "@type": "Organization", name: site.name },
    publisher: organizationSchema(),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>): SchemaNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>): SchemaNode {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
