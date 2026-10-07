/**
 * Explore and listing-detail tests.
 *
 * Covers the asynchronous states the board now has (loading, empty, error, data)
 * and the public/owner split on the detail screen — specifically that a non-owner
 * never renders Finder private details or verification questions.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type {
  CursorPage,
  ListingSummary,
  OwnerListingDetail,
  PublicListingDetail,
} from "@/lib/services/listing-types";

const getExploreItemsMock = vi.fn();
const getItemByIdMock = vi.fn();
const getMyItemDetailMock = vi.fn();

let currentUserId = "user-a";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    session: {},
    user: { id: currentUserId },
    isAuthenticated: true,
    isLoading: false,
    isConfigured: true,
  }),
}));

vi.mock("@/lib/services/listing-service", () => ({
  getExploreItems: (...args: unknown[]) => getExploreItemsMock(...args),
  getItemById: (...args: unknown[]) => getItemByIdMock(...args),
  getMyItemDetail: (...args: unknown[]) => getMyItemDetailMock(...args),
  getMyItems: vi.fn(async () => []),
  createLostItem: vi.fn(),
  createFoundItem: vi.fn(),
  updateMyItem: vi.fn(),
  closeMyItem: vi.fn(),
  cancelMyItem: vi.fn(),
  uploadItemImages: vi.fn(),
  deleteItemImage: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ removeAllChannels: vi.fn(async () => []) }),
}));

const { ExplorePage, ListingPage } = await import("@/components/kept-board-pages");

function summary(overrides: Partial<ListingSummary> = {}): ListingSummary {
  return {
    id: "item-1",
    userId: "user-b",
    listingType: "FOUND",
    title: "Grey oversized hoodie",
    category: "clothing",
    brand: null,
    color: "Grey",
    locationText: "Central Library",
    eventDate: "2026-10-06",
    status: "ACTIVE",
    coverImageUrl: null,
    createdAt: "2026-10-06T10:00:00.000Z",
    creatorName: "Ananya Sharma",
    ...overrides,
  };
}

function page(data: ListingSummary[]): CursorPage<ListingSummary> {
  return { data, nextCursor: null, hasMore: false };
}

const publicDetail: PublicListingDetail = {
  id: "item-1",
  userId: "user-b",
  listingType: "FOUND",
  title: "Grey oversized hoodie",
  category: "clothing",
  brand: null,
  color: "Grey",
  description: "A grey pullover hoodie found near the reading area.",
  eventDate: "2026-10-06",
  eventTime: "10:30:00",
  locationText: "Central Library",
  status: "ACTIVE",
  images: [],
  creator: {
    id: "user-b",
    displayName: "Ananya Sharma",
    username: "ananya",
    avatarPath: null,
    trustScore: 96,
    averageRating: 4.9,
    ratingCount: 14,
    successfulReturns: 12,
    createdAt: "2025-03-01T10:00:00.000Z",
  },
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
};

const ownerDetail: OwnerListingDetail = {
  ...publicDetail,
  latitude: 12.9716,
  longitude: 77.5946,
  closedReason: null,
  closedAt: null,
  privateDetails: {
    itemId: "item-1",
    privateNotes: "Stitched initials inside the collar",
    serialFragment: null,
    uniqueMarkings: null,
    privateContents: null,
  },
  verificationQuestions: [
    { id: "q-1", question: "What is stitched inside the collar?", position: 0 },
  ],
};

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId = "user-a";
});

describe("ExplorePage", () => {
  it("shows a loading state before the board resolves", () => {
    getExploreItemsMock.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<ExplorePage />);
    expect(screen.getByText(/loading items/i)).toBeInTheDocument();
  });

  it("renders real listings once they load", async () => {
    getExploreItemsMock.mockResolvedValue(
      page([summary(), summary({ id: "item-2", title: "Hostel key" })]),
    );
    renderWithQuery(<ExplorePage />);

    expect(await screen.findByText("Grey oversized hoodie")).toBeInTheDocument();
    expect(screen.getByText("Hostel key")).toBeInTheDocument();
    // The stored slug is rendered through its label, never raw as "clothing".
    expect(screen.queryByText("clothing")).not.toBeInTheDocument();
    const cardLabels = screen.getAllByText("Clothing").filter((node) => node.tagName !== "OPTION");
    expect(cardLabels.length).toBeGreaterThan(0);
  });

  it("shows an empty state, not a blank grid, when nothing is on the board", async () => {
    getExploreItemsMock.mockResolvedValue(page([]));
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByText(/the board is empty/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry when the board fails", async () => {
    getExploreItemsMock.mockRejectedValue(new Error("network"));
    renderWithQuery(<ExplorePage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/did not load/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("never renders a closed listing as open", async () => {
    getExploreItemsMock.mockResolvedValue(page([summary({ status: "RETURNED" })]));
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByText("Returned")).toBeInTheDocument();
  });
});

describe("ListingPage", () => {
  it("renders the public detail for a non-owner", async () => {
    getItemByIdMock.mockResolvedValue(publicDetail);
    renderWithQuery(<ListingPage id="item-1" />);

    expect(await screen.findByText(/grey pullover hoodie/i)).toBeInTheDocument();
    expect(screen.getByText("Central Library")).toBeInTheDocument();
  });

  it("does not render Finder private details or questions to a non-owner", async () => {
    getItemByIdMock.mockResolvedValue(publicDetail);
    // Even if the owner query were somehow answered, the viewer is not the owner.
    getMyItemDetailMock.mockResolvedValue(ownerDetail);

    renderWithQuery(<ListingPage id="item-1" />);
    await screen.findByText(/grey pullover hoodie/i);

    expect(screen.queryByText(/stitched initials inside the collar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what is stitched inside the collar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/only you see this/i)).not.toBeInTheDocument();
    // The owner read must not even be attempted for a non-owner.
    expect(getMyItemDetailMock).not.toHaveBeenCalled();
  });

  it("renders private details and questions for the owner", async () => {
    currentUserId = "user-b";
    getItemByIdMock.mockResolvedValue(publicDetail);
    getMyItemDetailMock.mockResolvedValue(ownerDetail);

    renderWithQuery(<ListingPage id="item-1" />);

    expect(await screen.findByText(/stitched initials inside the collar/i)).toBeInTheDocument();
    expect(screen.getByText(/what is stitched inside the collar/i)).toBeInTheDocument();
  });

  it("shows a not-found screen when the listing is absent or not visible", async () => {
    getItemByIdMock.mockResolvedValue(null);
    renderWithQuery(<ListingPage id="missing" />);
    expect(await screen.findByText(/item not found/i)).toBeInTheDocument();
  });

  it("shows an error state when the listing read fails", async () => {
    getItemByIdMock.mockRejectedValue(new Error("network"));
    renderWithQuery(<ListingPage id="item-1" />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
