import { afterEach, describe, expect, it } from "vitest";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import { GET as getCategories } from "./route";
import { GET as getBrands } from "../brands/route";
import { resetRepositories, setCatalogRepository } from "../../_lib/compose";

afterEach(() => {
  resetRepositories();
});

describe("category and brand lists", () => {
  it("returns category tree and brands as DTOs", async () => {
    setCatalogRepository(
      createMemoryCatalogRepository({
        categories: [
          { slug: "bikes", name: "Велосипеды", parentSlug: null, sortOrder: 0 },
          { slug: "road", name: "Шоссе", parentSlug: "bikes", sortOrder: 1 },
        ],
        brands: [{ slug: "trek", name: "Trek" }],
      }),
    );
    const categories = await getCategories(
      new Request("http://localhost/api/v1/categories"),
    );
    const brands = await getBrands(new Request("http://localhost/api/v1/brands"));
    expect(await categories.json()).toMatchObject({
      ok: true,
      data: [
        { slug: "bikes", name: "Велосипеды", parentSlug: null },
        { slug: "road", name: "Шоссе", parentSlug: "bikes" },
      ],
    });
    expect(await brands.json()).toMatchObject({
      ok: true,
      data: [{ slug: "trek", name: "Trek" }],
    });
  });
});
