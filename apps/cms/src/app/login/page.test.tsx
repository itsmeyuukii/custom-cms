import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const { signIn, push } = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  signIn.mockReset();
  push.mockReset();
});

async function submit(email: string, password: string) {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("signs in with the credentials and goes to /admin", async () => {
    signIn.mockResolvedValue({ error: undefined, code: undefined, ok: true });

    await submit("admin@example.com", "secret");

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "admin@example.com",
      password: "secret",
      redirect: false,
    });
    expect(push).toHaveBeenCalledWith("/admin");
    expect(screen.queryByText(/invalid|too many/i)).not.toBeInTheDocument();
  });

  it("shows the invalid-credentials message for a wrong password", async () => {
    signIn.mockResolvedValue({
      error: "CredentialsSignin",
      code: "credentials",
    });

    await submit("admin@example.com", "wrong");

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the rate-limit message when sign-in is rate limited", async () => {
    signIn.mockResolvedValue({
      error: "CredentialsSignin",
      code: "rate_limited",
    });

    await submit("admin@example.com", "secret");

    expect(
      await screen.findByText(
        "Too many sign-in attempts. Try again in a few minutes.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
