import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "./action-form";

function renderForm(
  action: (state: FormState, formData: FormData) => Promise<FormState>,
  resetOnSuccess?: boolean,
) {
  render(
    <ActionForm action={action} resetOnSuccess={resetOnSuccess}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" defaultValue="" />
      <button type="submit">Save</button>
    </ActionForm>,
  );
}

async function submit(title: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Title"), title);
  await user.click(screen.getByRole("button", { name: "Save" }));
}

describe("ActionForm", () => {
  it("sends the form's fields to the action", async () => {
    const action = vi
      .fn<(state: FormState, formData: FormData) => Promise<FormState>>()
      .mockResolvedValue({ error: null });
    renderForm(action);

    await submit("Hello");

    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][1];
    expect(formData.get("title")).toBe("Hello");
  });

  it("shows the returned error and keeps what was typed", async () => {
    renderForm(async () => ({ error: "That slug is already in use" }));

    await submit("Hello");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That slug is already in use",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Hello");
  });

  it("clears a previous error once a submit succeeds", async () => {
    const action = vi
      .fn<(state: FormState, formData: FormData) => Promise<FormState>>()
      .mockResolvedValueOnce({ error: "Name is required" })
      .mockResolvedValueOnce({ error: null });
    renderForm(action);

    await submit("a");
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await submit("b");
    await vi.waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });

  it("resets the fields after a success only when asked to", async () => {
    renderForm(async () => ({ error: null }), true);

    await submit("Hello");

    await vi.waitFor(() =>
      expect(screen.getByLabelText("Title")).toHaveValue(""),
    );
  });

  it("keeps the fields after a success by default (edit forms)", async () => {
    const action = vi.fn(async () => ({ error: null }));
    renderForm(action);

    await submit("Hello");

    await vi.waitFor(() => expect(action).toHaveBeenCalled());
    expect(screen.getByLabelText("Title")).toHaveValue("Hello");
  });
});
