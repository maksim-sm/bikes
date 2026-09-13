import type { Metadata } from "next";
import { absoluteUrl } from "./urls";

export const noIndexRobots = { index: false, follow: false } as const;

export function publicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt: string };
  robots?: { index: boolean; follow: boolean };
}): Metadata {
  const url = absoluteUrl(input.path);
  const image = input.image
    ? {
        url: input.image.url.startsWith("http")
          ? input.image.url
          : absoluteUrl(input.image.url),
        alt: input.image.alt,
      }
    : undefined;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: "website",
      ...(image ? { images: [image] } : {}),
    },
    ...(input.robots ? { robots: input.robots } : {}),
  };
}
