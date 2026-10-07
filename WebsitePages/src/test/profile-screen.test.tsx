/**
 * Profile screen tests.
 *
 * Covers that canonical backend values are rendered, that the new-member
 * presentation is used for a fresh account, and that the editor offers no control
 * for any backend-owned reputation field.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { MyProfile } from "@/lib/services/profile-types";

const getCurrentProfileMock = vi.fn();
const updateCurrentProfileMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({ redirect: undefined }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    session: {},
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
    isConfigured: true,
  }),
}));

vi.mock("@/lib/services/profile-service", () => ({
  getCurrentProfile: (...args: unknown[]) => getCurrentProfileMock(...args),
  updateCurrentProfile: (...args: unknown[]) => updateCurrentProfileMock(...args),
}));

vi.mock("@/lib/services/auth-service", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ removeAllChannels: vi.fn(async () => []) }),
}));

const { ProfilePage } = await import("@/components/kept-account-pages");

const establishedProfile: MyProfile = {
  id: "user-1",
  displayName: "Ananya Sharma",
  username: "ananya",
  avatarPath: null,
  trustScore: 96,
  averageRating: 4.9,
  ratingCount: 14,
  successfulReturns: 12,
  createdAt: "2025-03-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
};

const newProfile: MyProfile = {
  ...establishedProfile,
  displayName: "New Member",
  username: null,
  trustScore: 50,
  averageRating: null,
  ratingCount: 0,
  successfulReturns: 0,
  createdAt: "2026-10-07T10:00:00.000Z",
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfilePage", () => {
  it("renders the canonical backend values", async () => {
    getCurrentProfileMock.mockResolvedValue(establishedProfile);
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText("Ananya Sharma")).toBeInTheDocument();
    expect(screen.getByText("96")).toBeInTheDocument();
    expect(screen.getByText("4.9")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/CAMPUS MEMBER SINCE 2025/i)).toBeInTheDocument();
  });

  it("uses the new-member presentation for a fresh account", async () => {
    getCurrentProfileMock.mockResolvedValue(newProfile);
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText("New Member")).toBeInTheDocument();
    // No ratings yet means no average to show, rather than a misleading 0.0.
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/just getting started/i)).toBeInTheDocument();
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it("offers no editor control for any backend-owned reputation field", async () => {
    const user = userEvent.setup();
    getCurrentProfileMock.mockResolvedValue(establishedProfile);
    renderWithProviders(<ProfilePage />);

    await user.click(await screen.findByRole("button", { name: /edit profile/i }));

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    for (const field of [/trust score/i, /average rating/i, /rating count/i, /returns/i]) {
      expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
    }
  });

  it("sends only safe fields when saving", async () => {
    const user = userEvent.setup();
    getCurrentProfileMock.mockResolvedValue(establishedProfile);
    updateCurrentProfileMock.mockResolvedValue({ ...establishedProfile, displayName: "Ananya S" });
    renderWithProviders(<ProfilePage />);

    await user.click(await screen.findByRole("button", { name: /edit profile/i }));
    const nameInput = screen.getByLabelText(/display name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Ananya S");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(updateCurrentProfileMock).toHaveBeenCalled());
    const payload = updateCurrentProfileMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["displayName", "username"]);
  });

  it("rejects a malformed username before calling the service", async () => {
    const user = userEvent.setup();
    getCurrentProfileMock.mockResolvedValue(establishedProfile);
    renderWithProviders(<ProfilePage />);

    await user.click(await screen.findByRole("button", { name: /edit profile/i }));
    const usernameInput = screen.getByLabelText(/username/i);
    await user.clear(usernameInput);
    await user.type(usernameInput, "No Spaces!");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/lowercase letters/i);
    expect(updateCurrentProfileMock).not.toHaveBeenCalled();
  });

  it("shows an error state when the profile cannot be loaded", async () => {
    getCurrentProfileMock.mockRejectedValue(new Error("boom"));
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText(/could not load your profile/i)).toBeInTheDocument();
  });
});
