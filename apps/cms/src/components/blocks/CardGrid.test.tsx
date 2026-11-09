import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardGrid } from "./CardGrid";

describe("CardGrid", () => {
  it("renders one card per entry, with optional parts only when given", () => {
    render(
      <CardGrid
        cards={[
          {
            title: "Fast",
            description: "Loads quickly",
            imageUrl: "/fast.png",
          },
          { title: "Simple" },
        ]}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["Fast", "Simple"]);
    expect(screen.getByText("Loads quickly")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "/fast.png");
    expect(images[0]).toHaveAttribute("alt", "Fast");
  });

  it("renders an empty grid when cards is missing", () => {
    const { container } = render(<CardGrid />);

    expect(container.querySelector("section")).toBeEmptyDOMElement();
  });
});
