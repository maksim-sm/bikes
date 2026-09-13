import { describe, expect, it } from "vitest";
import { mediaImageAttrs } from "./media-image";

describe("mediaImageAttrs", () => {
  it("reserves 1200×800 and lazy-loads gallery images", () => {
    expect(
      mediaImageAttrs({ src: "/api/media/demo/emonda-side", alt: "side" }),
    ).toMatchObject({
      width: 1200,
      height: 800,
      loading: "lazy",
      decoding: "async",
      fetchPriority: "low",
    });
  });

  it("marks the LCP image eager with high fetch priority", () => {
    expect(
      mediaImageAttrs({
        src: "/api/media/demo/emonda-front",
        alt: "front",
        priority: true,
        sizes: "(min-width: 768px) 50vw, 100vw",
      }),
    ).toMatchObject({
      loading: "eager",
      decoding: "sync",
      fetchPriority: "high",
      sizes: "(min-width: 768px) 50vw, 100vw",
    });
  });
});
