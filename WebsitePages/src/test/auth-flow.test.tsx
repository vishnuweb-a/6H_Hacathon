/**
 * Auth screen and session-aware UI tests.
 *
 * The Supabase client is mocked at the service boundary: these tests cover the
 * screen's behaviour (validation, submitting state, error surfacing, logout), not
 * Supabase itself. Database-level authorization is covered by the RLS tests in
 * `supabase/tests/`.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const navigateMock = vi.fn();
const signInMock = vi.fn();
const signUpMock = vi.fn();
const signOutMock = vi.fn();
const resetMock = vi.fn();

let authState = {
  session: null as unknown,
  user: null as { id: string } | null,
  isAuthenticated: false,
  isLoading: false,
  isConfigured: true,
};

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
  useNavigate: () => navigateMock,
  useSearch: () => ({ redirect: undefined }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/services/auth-service", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signUp: (...args: unknown[]) => signUpMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  requestPasswordReset: (...args: unknown[]) => resetMock(...args),
}));

vi.mock("@/lib/services/profile-service", () => ({
  getCurrentProfile: vi.fn(async () => null),
  updateCurrentProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ removeAllChannels: vi.fn(async () => []) }),
}));

const { AuthPage } = await import("@/components/kept-account-pages");

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  authState = {
    session: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isConfigured: true,
  };
});

describe("AuthPage validation", () => {
  it("rejects a malformed email without calling Supabase", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthPage />);

    // `a@b` satisfies the input's native `type="email"` check but not the schema,
    // so this exercises our own validation rather than the browser's.
    await user.type(screen.getByLabelText(/college email/i), "a@b");
    await user.type(screen.getByLabelText(/^password/i), "longenoughpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects a password under 8 characters without calling Supabase", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthPage />);

    await user.type(screen.getByLabelText(/college email/i), "student@college.edu");
    await user.type(screen.getByLabelText(/^password/i), "short");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8 characters/i);
    expect(signInMock).not.toHaveBeenCalled();
  });
});

describe("AuthPage sign in", () => {
  it("navigates after a successful sign in", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({ ok: true, data: { session: { user: { id: "user-1" } } } });
    renderWithProviders(<AuthPage />);

    await user.type(screen.getByLabelText(/college email/i), "student@college.edu");
    await user.type(screen.getByLabelText(/^password/i), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/activity" }));
    expect(signInMock).toHaveBeenCalledWith({
      email: "student@college.edu",
      password: "correct-horse-battery",
    });
  });

  it("surfaces a friendly error and does not navigate on failure", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValue({
      ok: false,
      error: "That email and password combination does not match an account.",
    });
    renderWithProviders(<AuthPage />);

    await user.type(screen.getByLabelText(/college email/i), "student@college.edu");
    await user.type(screen.getByLabelText(/^password/i), "wrong-password-here");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/does not match an account/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("tells the user to confirm their email when sign up returns no session", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue({ ok: true, data: { session: null } });
    renderWithProviders(<AuthPage />);

    await user.click(screen.getByRole("tab", { name: /sign up/i }));
    await user.type(screen.getByLabelText(/display name/i), "Ananya Sharma");
    await user.type(screen.getByLabelText(/college email/i), "ananya@college.edu");
    await user.type(screen.getByLabelText(/^password/i), "a-good-long-password");
    await user.click(screen.getByRole("button", { name: /join kept/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/confirm your email/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe("AuthPage session-aware UI", () => {
  it("shows the signed-in panel instead of the form when authenticated", () => {
    authState = { ...authState, isAuthenticated: true, user: { id: "user-1" } };
    renderWithProviders(<AuthPage />);

    expect(screen.getByText(/you’re signed in to your campus community/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();
  });

  it("calls signOut from the signed-in panel", async () => {
    const user = userEvent.setup();
    signOutMock.mockResolvedValue({ ok: true, data: null });
    authState = { ...authState, isAuthenticated: true, user: { id: "user-1" } };
    renderWithProviders(<AuthPage />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
  });
});
