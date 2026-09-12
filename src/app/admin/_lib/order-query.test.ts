import { describe, expect, it } from "vitest";
import { parseAdminOrderQuery } from "./order-query";

describe("parseAdminOrderQuery", () => {
  it("keeps known filters and drops junk", () => {
    expect(
      parseAdminOrderQuery({
        q: "  B-1  ",
        status: "PLACED",
        paymentStatus: "not-a-status",
        fulfillmentStatus: "SHIPPED",
      }),
    ).toEqual({
      q: "B-1",
      status: "PLACED",
      fulfillmentStatus: "SHIPPED",
    });
  });
});
