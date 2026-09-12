import { describe, expect, it } from "vitest";
import { isMediaKey, placeholderSvg } from "./placeholder";

describe("media placeholder", () => {
  it("accepts opaque catalog keys and rejects traversal", () => {
    expect(isMediaKey("demo/emonda-front")).toBe(true);
    expect(isMediaKey("../secret")).toBe(false);
    expect(isMediaKey("")).toBe(false);
  });

  it("embeds the key label inside an SVG", () => {
    const svg = placeholderSvg("demo/emonda-front");
    expect(svg).toContain("<svg");
    expect(svg).toContain("emonda-front");
    expect(svg).not.toContain("<script");
  });
});
