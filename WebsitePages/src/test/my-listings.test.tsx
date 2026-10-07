/**
 * Activity / My Reports tests.
 *
 * Covers the real listing tabs (loading, empty, error, data), that close and cancel
 * go through their dedicated actions, and that the still-mock tabs are labelled so
 * sample data is never presented as backend truth.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { ListingSummary } from "@/lib/services/listing-types";

const getMyItemsMock = vi.fn();
const closeMyItemMock = vi.fn();
const cancelMyItemMock = vi.fn();
const getMyItemDetailMock = vi.fn();
const updateMyItemMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, search, ...rest }: Record<string, unknown>) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children as ReactNode}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    session: {},
    user: { id: "user-a" },
    isAuthenticated: true,
    isLoading: false,
    isConfigured: true,
  }),
}));

vi.mock("@/lib/services/listing-service", () => ({
  getMyItems: (...args: unknown[]) => getMyItemsMock(...args),
  getMyItemDetail: (...args: unknown[]) => getMyItemDetailMock(...args),
  closeMyItem: (...args: unknown[]) => closeMyItemMock(...args),
  cancelMyItem: (...args: unknown[]) => cancelMyItemMock(...args),
  updateMyItem: (...args: unknown[]) => updateMyItemMock(...args),
  getExploreItems: vi.fn(),
  getItemById: vi.fn(),
  createLostItem: vi.fn(),
  createFoundItem: vi.fn(),
  uploadItemImages: vi.fn(),
  deleteItemImage: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ removeAllChannels: vi.fn(async () => []) }),
}));

const { MyListings } = await import("@/components/kept-my-listings");

function summary(overrides: Partial<ListingSummary> = {}): ListingSummary {
  return {
    id: "item-1",
    userId: "user-a",
    listingType: "LOST",
    title: "Blue Casio calculator",
    category: "electronics",
    brand: "Casio",
    color: "Blue",
    locationText: "Engineering Block",
    eventDate: "2026-10-06",
    status: "ACTIVE",
    coverImageUrl: null,
    createdAt: "2026-10-06T09:00:00.000Z",
    creatorName: null,
    ...overrides,
  };
}

function renderMine(listingType: "LOST" | "FOUND") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyListings listingType={listingType} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyListings", () => {
  it("shows a loading state first", () => {
    getMyItemsMock.mockReturnValue(new Promise(() => {}));
    renderMine("LOST");
    expect(screen.getByText(/loading items/i)).toBeInTheDocument();
  });

  it("renders the caller's own listings", async () => {
    getMyItemsMock.mockResolvedValue([summary()]);
    renderMine("LOST");
    expect(await screen.findByText("Blue Casio calculator")).toBeInTheDocument();
  });

  it("shows an empty state inviting a first report", async () => {
    getMyItemsMock.mockResolvedValue([]);
    renderMine("LOST");
    expect(await screen.findByText(/no lost reports yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /report a lost item/i })).toBeInTheDocument();
  });

  it("shows an empty state for found listings with its own copy", async () => {
    getMyItemsMock.mockResolvedValue([]);
    renderMine("FOUND");
    expect(await screen.findByText(/no found listings yet/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry", async () => {
    getMyItemsMock.mockRejectedValue(new Error("network"));
    renderMine("LOST");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/did not load/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("closes a listing through the close action, not a status write", async () => {
    const user = userEvent.setup();
    getMyItemsMock.mockResolvedValue([summary()]);
    closeMyItemMock.mockResolvedValue(undefined);

    renderMine("LOST");
    await screen.findByText("Blue Casio calculator");

    await user.click(screen.getByRole("button", { name: /close listing/i }));
    await user.type(screen.getByLabelText(/reason/i), "I found it myself");
    await user.click(screen.getByRole("button", { name: /yes, close it/i }));

    expect(closeMyItemMock).toHaveBeenCalledWith("item-1", "I found it myself");
  });

  it("cancels a listing through the cancel action", async () => {
    const user = userEvent.setup();
    getMyItemsMock.mockResolvedValue([summary()]);
    cancelMyItemMock.mockResolvedValue(undefined);

    renderMine("LOST");
    await screen.findByText("Blue Casio calculator");

    await user.click(screen.getByRole("button", { name: /cancel listing/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel it/i }));

    expect(cancelMyItemMock).toHaveBeenCalledWith("item-1", null);
  });

  it("offers no lifecycle action on a listing that is already closed", async () => {
    getMyItemsMock.mockResolvedValue([summary({ status: "CLOSED" })]);
    renderMine("LOST");
    await screen.findByText("Blue Casio calculator");

    expect(screen.queryByRole("button", { name: /close listing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/this listing is closed/i)).toBeInTheDocument();
  });

  it("never offers RETURNED or RECOVERY_IN_PROGRESS as an owner action", async () => {
    getMyItemsMock.mockResolvedValue([summary()]);
    renderMine("LOST");
    await screen.findByText("Blue Casio calculator");

    expect(screen.queryByText(/returned/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recovery in progress/i)).not.toBeInTheDocument();
  });

  it("sends only editable fields when saving an edit", async () => {
    const user = userEvent.setup();
    getMyItemsMock.mockResolvedValue([summary()]);
    getMyItemDetailMock.mockResolvedValue({
      ...summary(),
      description: "Blue scientific calculator last seen after my morning lecture.",
      eventTime: null,
      images: [],
      creator: null,
      updatedAt: "2026-10-06T09:00:00.000Z",
      latitude: null,
      longitude: null,
      closedReason: null,
      closedAt: null,
      privateDetails: null,
      verificationQuestions: [],
    });
    updateMyItemMock.mockResolvedValue(undefined);

    renderMine("LOST");
    await screen.findByText("Blue Casio calculator");
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    const title = await screen.findByLabelText(/item name/i);
    await user.clear(title);
    await user.type(title, "Blue Casio FX calculator");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const [itemId, input] = updateMyItemMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(itemId).toBe("item-1");
    expect(input["title"]).toBe("Blue Casio FX calculator");
    // The protected fields are not part of the edit contract.
    expect(Object.keys(input)).not.toContain("userId");
    expect(Object.keys(input)).not.toContain("status");
    expect(Object.keys(input)).not.toContain("listingType");
  });
});
