import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExampleHeading } from "./example-heading";

describe("ExampleHeading", () => {
  it("выводит переданный текст как заголовок", () => {
    render(<ExampleHeading text="Велосипеды" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Велосипеды" }),
    ).toBeInTheDocument();
  });
});
