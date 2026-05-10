import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, type RenderResult } from "vitest-browser-react";
import { type Locator, userEvent } from "vitest/browser";
import { UserAuthForm } from "./user-auth-form";

const FORM_MESSAGES = {
  emailEmpty: "Please enter your email.",
  passwordEmpty: "Please enter your password.",
  passwordShort: "Password must be at least 7 characters long.",
} as const;

const navigate = vi.fn();
const signInEmail = vi.fn(() =>
  Promise.resolve({ data: { user: { email: "a@b.com" } }, error: null }),
);

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: (...args: Parameters<typeof signInEmail>) => signInEmail(...args),
    },
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig()),
  sleep: vi.fn(() => Promise.resolve()),
}));

describe("UserAuthForm", () => {
  describe("Rendering without redirectTo", () => {
    let screen: RenderResult;
    let emailInput: Locator;
    let passwordInput: Locator;
    let signInButton: Locator;

    beforeEach(async () => {
      vi.clearAllMocks();
      screen = await render(<UserAuthForm />);
      emailInput = screen.getByRole("textbox", { name: /^Email$/i });
      passwordInput = screen.getByLabelText(/^Password$/i);
      signInButton = screen.getByRole("button", { name: /^Sign in$/i });
    });

    it("renders fields and submit button", async () => {
      await expect.element(emailInput).toBeInTheDocument();
      await expect.element(passwordInput).toBeInTheDocument();
      await expect.element(signInButton).toBeInTheDocument();
    });

    it("shows validation messages when submitting empty form", async () => {
      await userEvent.click(signInButton);

      await expect.element(screen.getByText(FORM_MESSAGES.emailEmpty)).toBeInTheDocument();
      await expect.element(screen.getByText(FORM_MESSAGES.passwordEmpty)).toBeInTheDocument();
    });

    it("authenticates and navigates to default route on success", async () => {
      await userEvent.fill(emailInput, "a@b.com");
      await userEvent.fill(passwordInput, "1234567");

      await userEvent.click(signInButton);

      await vi.waitFor(() => expect(signInEmail).toHaveBeenCalledOnce());
      await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
    });
  });

  it("navigates to redirectTo when provided", async () => {
    vi.clearAllMocks();

    const { getByRole, getByLabelText } = await render(<UserAuthForm redirectTo="/settings" />);

    await userEvent.fill(getByRole("textbox", { name: /Email/i }), "a@b.com");
    await userEvent.fill(getByLabelText("Password"), "1234567");

    await userEvent.click(getByRole("button", { name: /Sign in/i }));

    await vi.waitFor(() => expect(signInEmail).toHaveBeenCalledOnce());

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/settings",
        replace: true,
      }),
    );
  });
});
