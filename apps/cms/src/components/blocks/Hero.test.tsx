import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("renders the heading on its own", () => {
    render(<Hero heading="Welcome" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the subheading and call to action when given", () => {
    render(
      <Hero
        heading="Welcome"
        subheading="Build pages from blocks"
        ctaLabel="Get started"
        ctaHref="/start"
      />,
    );

    expect(screen.getByText("Build pages from blocks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/start",
    );
  });

  it("leaves out the call to action unless both label and href are set", () => {
    render(<Hero heading="Welcome" ctaLabel="Get started" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
