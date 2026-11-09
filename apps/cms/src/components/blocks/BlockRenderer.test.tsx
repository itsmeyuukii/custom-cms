import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockRenderer } from "./BlockRenderer";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BlockRenderer", () => {
  it("renders each block with its registered component, in order", () => {
    render(
      <BlockRenderer
        blocks={[
          { id: "b1", component: { key: "hero" }, data: { heading: "Hello" } },
          {
            id: "b2",
            component: { key: "card-grid" },
            data: { cards: [{ title: "Card one" }] },
          },
        ]}
      />,
    );

    const headings = screen.getAllByRole("heading");
    expect(headings.map((h) => h.textContent)).toEqual(["Hello", "Card one"]);
  });

  it("skips a block with an unregistered key and warns outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <BlockRenderer
        blocks={[
          { id: "b1", component: { key: "missing" }, data: {} },
          { id: "b2", component: { key: "hero" }, data: { heading: "Shown" } },
        ]}
      />,
    );

    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      'No block component registered for key "missing"',
    );
  });
});
