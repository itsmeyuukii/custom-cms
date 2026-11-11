import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminError from "./error";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderError(digest?: string) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const retry = vi.fn();
  const error = Object.assign(new Error("hidden in production"), { digest });
  render(<AdminError error={error} retry={retry} />);
  return retry;
}

describe("admin error screen", () => {
  it("explains what happened without showing the error's message", () => {
    renderError("1234567890");

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/hidden in production/)).not.toBeInTheDocument();
  });

  it("shows the digest so the error can be found in the server logs", () => {
    renderError("1234567890");

    expect(screen.getByText(/1234567890/)).toBeInTheDocument();
  });

  it("leaves out the reference line when there's no digest", () => {
    renderError(undefined);

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("tries again when asked", async () => {
    const retry = renderError("1234567890");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
