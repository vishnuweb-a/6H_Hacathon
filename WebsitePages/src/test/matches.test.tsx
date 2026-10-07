/**
 * Matches screen and match DTO tests.
 *
 * Covers the real Matches surface (loading, empty, error, data), score and
 * strength rendering, the public-safe explanation chips, dismissal, the Home
 * preview, the Activity integration, and two things that are security
 * properties rather than UI behaviour:
 *
 *   * the rendered output contains no coordinate, distance or private evidence —
 *     asserted against the DOM, not just the type;
 *   * no ownership-probability language reaches the screen, and no Claim action
 *     appears on a match (Phase 5).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { MatchSummary } from "@/lib/services/match-types";

const getMyMatchesMock = vi.fn();
const getMatchesForItemMock = vi.fn();
const dismissMatchMock = vi.fn();
const restoreMatchMock = vi.fn();
const navigateMock = vi.fn();
let currentSearch: { strength?: "VERY_STRONG" | "STRONG" | "POSSIBLE" } = {};

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, search, ...rest }: Record<string, unknown>) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children as ReactNode}
    </a>
  ),
  useNavigate: () => navigateMock,
  useSearch: () => currentSearch,
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

vi.mock("@/lib/services/match-service", () => ({
  getMyMatches: (...args: unknown[]) => getMyMatchesMock(...args),
  getMatchesForItem: (...args: unknown[]) => getMatchesForItemMock(...args),
  dismissMatch: (...args: unknown[]) => dismissMatchMock(...args),
  restoreMatch: (...args: unknown[]) => restoreMatchMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ removeAllChannels: vi.fn(async () => []) }),
}));

vi.mock("@/lib/services/listing-service", () => ({
  getExploreItems: vi.fn(async () => ({ data: [], nextCursor: null, hasMore: false })),
  getMyItems: vi.fn(async () => []),
  closeMyItem: vi.fn(async () => undefined),
  getItemById: vi.fn(),
  getMyItemDetail: vi.fn(),
}));
vi.mock("@/lib/kept-context", () => ({
  useKept: () => ({ claims: [], handedOver: false, received: false }),
}));

const { HomePage, MatchesPage } = await import("@/components/kept-board-pages");

/**
 * A match DTO exactly as the service produces one.
 *
 * Note what cannot be written here even deliberately: there is no latitude,
 * longitude or distance field on `MatchSummary`, and no private-evidence field.
 * The shape itself is the first line of the privacy guarantee.
 */
function match(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: "match-1",
    lostItemId: "lost-1",
    foundItemId: "found-1",
    overallScore: 92.0,
    displayScore: 92,
    categoryScore: 100,
    locationScore: 100,
    timeScore: 100,
    descriptionScore: 73.34,
    strength: "VERY_STRONG",
    status: "ACTIVE",
    matchedSignals: ["CATEGORY", "LOCATION", "DATE", "DESCRIPTION"],
    isDismissed: false,
    createdAt: "2026-10-07T10:00:00.000Z",
    updatedAt: "2026-10-07T10:00:00.000Z",
    otherListing: {
      id: "found-1",
      coverImageUrl: null,
      listingType: "FOUND",
      title: "White Apple earbuds",
      category: "electronics",
      categoryLabel: "Electronics",
      brand: "Apple",
      color: "white",
      description: "found white Apple earbuds inside a charging case at the library",
      eventDate: "2026-10-06",
      eventTime: "11:10:00",
      locationText: "Main Library Entrance",
      status: "ACTIVE",
      userId: "user-b",
    },
    myItemId: "lost-1",
    myItemTitle: "White AirPods Pro",
    ...overrides,
  };
}

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearch = {};
  dismissMatchMock.mockResolvedValue(undefined);
  restoreMatchMock.mockResolvedValue(undefined);
  getMatchesForItemMock.mockResolvedValue([]);
});

describe("MatchesPage", () => {
  it("shows a loading state while matches are being fetched", () => {
    getMyMatchesMock.mockReturnValue(new Promise(() => {}));

    renderWithClient(<MatchesPage />);

    expect(screen.getByText(/loading your matches/i)).toBeInTheDocument();
  });

  it("renders the real score, strength label and listing information", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    renderWithClient(<MatchesPage />);

    expect(await screen.findByText("White Apple earbuds")).toBeInTheDocument();
    // The whole-percent score, not the stored 92.00.
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText(/very strong match/i)).toBeInTheDocument();
    expect(screen.getByText(/Main Library Entrance/)).toBeInTheDocument();
    // The card says which of the user's own reports produced the match.
    expect(screen.getByText(/White AirPods Pro/)).toBeInTheDocument();
  });

  it("renders the real cover photo in the approved thumbnail frame", async () => {
    const fixture = match();
    fixture.otherListing.coverImageUrl = "https://example.test/authorized-cover.jpg";
    getMyMatchesMock.mockResolvedValue([fixture]);
    renderWithClient(<MatchesPage />);
    expect(await screen.findByRole("img", { name: "White Apple earbuds" })).toHaveAttribute(
      "src",
      fixture.otherListing.coverImageUrl,
    );
  });

  it("never shows absurd score precision", async () => {
    getMyMatchesMock.mockResolvedValue([match({ overallScore: 92.137482, displayScore: 92 })]);

    const { container } = renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    expect(container.textContent).not.toMatch(/92\.13/);
    expect(container.textContent).toContain("92");
  });

  it("renders the public-safe explanation chips", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    expect(screen.getByText(/Same category/)).toBeInTheDocument();
    expect(screen.getByText(/Nearby location/)).toBeInTheDocument();
    expect(screen.getByText(/Dates line up/)).toBeInTheDocument();
    expect(screen.getByText(/Similar description/)).toBeInTheDocument();
  });

  it("describes compatible categories without claiming they are identical", async () => {
    getMyMatchesMock.mockResolvedValue([match({ categoryScore: 80 })]);
    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");
    expect(screen.getByText(/Related categories/)).toBeInTheDocument();
    expect(screen.queryByText(/Same category/)).not.toBeInTheDocument();
  });

  it("maps each strength band to its approved label", async () => {
    getMyMatchesMock.mockResolvedValue([
      match({ id: "m1", strength: "VERY_STRONG", displayScore: 94 }),
      match({ id: "m2", strength: "STRONG", displayScore: 82 }),
      match({ id: "m3", strength: "POSSIBLE", displayScore: 68 }),
    ]);

    renderWithClient(<MatchesPage />);

    // Scoped to the badge text, since the tab row also contains these words.
    expect(await screen.findByText("Very strong match")).toBeInTheDocument();
    expect(screen.getByText("Strong match")).toBeInTheDocument();
    expect(screen.getByText("Possible match")).toBeInTheDocument();
  });

  it("shows the calm empty state without implying the item cannot be recovered", async () => {
    getMyMatchesMock.mockResolvedValue([]);

    renderWithClient(<MatchesPage />);

    expect(await screen.findByText(/no strong matches yet/i)).toBeInTheDocument();
    expect(screen.getByText(/keep comparing/i)).toBeInTheDocument();
    // No despairing language.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/cannot be (found|recovered)/i);
    expect(body).not.toMatch(/gone forever/i);
  });

  it("shows an error state with a retry path", async () => {
    getMyMatchesMock.mockRejectedValue(new Error("boom"));

    renderWithClient(<MatchesPage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/could not load your matches/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("dismisses a match through the dedicated action", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    await userEvent.click(screen.getByRole("button", { name: /not my item/i }));

    await waitFor(() => expect(dismissMatchMock).toHaveBeenCalledWith("match-1"));
  });

  it("writes the selected strength band to URL state", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    await userEvent.click(screen.getByRole("tab", { name: /^very strong$/i }));

    expect(navigateMock).toHaveBeenCalledWith({
      search: { strength: "VERY_STRONG" },
      replace: true,
    });
  });
});

describe("match privacy and language", () => {
  it("renders no coordinate, distance or private evidence", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    const { container } = renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    const text = container.textContent ?? "";
    // Coordinates of the fixture's library location, had they ever been exposed.
    expect(text).not.toContain("12.97");
    expect(text).not.toContain("77.59");
    // No distance disclosure, precise or otherwise.
    expect(text).not.toMatch(/\bkm\b/i);
    expect(text).not.toMatch(/\bmetres?\b|\bmeters?\b/i);
    expect(text).not.toMatch(/\bdistance\b/i);
    // No private verification evidence.
    expect(text).not.toMatch(/serial/i);
    expect(text).not.toMatch(/private note/i);
    expect(text).not.toMatch(/unique marking/i);
    expect(text).not.toMatch(/verification (question|answer)/i);
  });

  it("presents the score as similarity, never as ownership or probability", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    const { container } = renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    const text = container.textContent ?? "";
    expect(text).toMatch(/similarity, not ownership/i);
    expect(text).not.toMatch(/probability/i);
    expect(text).not.toMatch(/ownership confidence/i);
    expect(text).not.toMatch(/is yours/i);
    expect(text).not.toMatch(/proof of ownership\b(?!\.)/i);
  });

  it("offers no claim action on a match — claiming is a later phase", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    expect(screen.queryByRole("link", { name: /claim/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /claim/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/this might be mine/i)).not.toBeInTheDocument();
    // It does offer the safe navigation.
    expect(screen.getByRole("link", { name: /see item/i })).toBeInTheDocument();
  });

  it("does not present live matching as a preview any more", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);

    const { container } = renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    expect(container.textContent ?? "").not.toMatch(/sample data|preview/i);
  });
});

describe("per-user dismissal semantics", () => {
  it("reflects the calling user's own dismissal state, not a global one", async () => {
    // The same pair, as the other participant sees it: not dismissed for them.
    getMyMatchesMock.mockResolvedValue([match({ isDismissed: false })]);

    renderWithClient(<MatchesPage />);

    expect(await screen.findByText("White Apple earbuds")).toBeInTheDocument();
    // The shared row is still ACTIVE: one user's dismissal is not an invalidation.
    expect(getMyMatchesMock).toHaveBeenCalled();
  });

  it("surfaces a dismissal failure without losing the list", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);
    dismissMatchMock.mockRejectedValue(new Error("nope"));

    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");

    await userEvent.click(screen.getByRole("button", { name: /not my item/i }));

    expect(await screen.findByText(/could not hide that match/i)).toBeInTheDocument();
    // The match is still on screen; the failure did not blank the page.
    expect(screen.getByText("White Apple earbuds")).toBeInTheDocument();
  });
});

describe("match DTO mapping", () => {
  it("rounds the display score without recomputing the authoritative one", async () => {
    const { mapMatchSummary } = await import("@/lib/services/match-types");

    const mapped = mapMatchSummary({
      id: "m",
      lost_item_id: "l",
      found_item_id: "f",
      overall_score: 89.67,
      category_score: 100,
      location_score: 80,
      time_score: 90,
      description_score: 88,
      strength: "STRONG",
      status: "ACTIVE",
      matched_signals: ["CATEGORY", "DATE"],
      is_dismissed: false,
      created_at: "2026-10-07T10:00:00.000Z",
      updated_at: "2026-10-07T10:00:00.000Z",
      other_item_id: "f",
      other_listing_type: "FOUND",
      other_title: "A found thing",
      other_category: "electronics",
      other_brand: null,
      other_color: null,
      other_description: "a description",
      other_event_date: "2026-10-06",
      other_event_time: null,
      other_location_text: "Somewhere",
      other_status: "ACTIVE",
      other_user_id: "user-b",
      my_item_id: "l",
      my_item_title: "My thing",
    });

    // The backend score is preserved exactly; only the display value is rounded.
    expect(mapped.overallScore).toBe(89.67);
    expect(mapped.displayScore).toBe(90);
    expect(mapped.strength).toBe("STRONG");
  });

  it("drops any signal that is not a known public-safe label", async () => {
    const { mapMatchSummary } = await import("@/lib/services/match-types");

    const mapped = mapMatchSummary({
      id: "m",
      lost_item_id: "l",
      found_item_id: "f",
      overall_score: 70,
      category_score: 100,
      location_score: null,
      time_score: 70,
      description_score: 60,
      strength: "POSSIBLE",
      status: "ACTIVE",
      // A value the UI has no label for must not reach the card.
      matched_signals: ["CATEGORY", "SERIAL_FRAGMENT", "PRIVATE_NOTE"],
      is_dismissed: false,
      created_at: "2026-10-07T10:00:00.000Z",
      updated_at: "2026-10-07T10:00:00.000Z",
      other_item_id: "f",
      other_listing_type: "FOUND",
      other_title: "A found thing",
      other_category: "electronics",
      other_brand: null,
      other_color: null,
      other_description: "a description",
      other_event_date: "2026-10-06",
      other_event_time: null,
      other_location_text: "Somewhere",
      other_status: "ACTIVE",
      other_user_id: "user-b",
      my_item_id: "l",
      my_item_title: "My thing",
    });

    expect(mapped.matchedSignals).toEqual(["CATEGORY"]);
  });

  it("maps a missing location score to null rather than zero", async () => {
    const { mapMatchSummary, matchStrengthFromScore } = await import("@/lib/services/match-types");

    const mapped = mapMatchSummary({
      id: "m",
      lost_item_id: "l",
      found_item_id: "f",
      overall_score: 92,
      category_score: 100,
      location_score: null,
      time_score: 85,
      description_score: 90,
      strength: "VERY_STRONG",
      status: "ACTIVE",
      matched_signals: ["CATEGORY", "DATE", "DESCRIPTION"],
      is_dismissed: false,
      created_at: "2026-10-07T10:00:00.000Z",
      updated_at: "2026-10-07T10:00:00.000Z",
      other_item_id: "f",
      other_listing_type: "FOUND",
      other_title: "A found thing",
      other_category: "electronics",
      other_brand: null,
      other_color: null,
      other_description: "a description",
      other_event_date: "2026-10-06",
      other_event_time: null,
      other_location_text: "Somewhere",
      other_status: "ACTIVE",
      other_user_id: "user-b",
      my_item_id: "l",
      my_item_title: "My thing",
    });

    // An unavailable signal stays unavailable — it is not a zero score.
    expect(mapped.locationScore).toBeNull();
    expect(mapped.matchedSignals).not.toContain("LOCATION");
    expect(matchStrengthFromScore(92)).toBe("VERY_STRONG");
  });

  it("maps the documented strength boundaries", async () => {
    const { matchStrengthFromScore } = await import("@/lib/services/match-types");

    expect(matchStrengthFromScore(100)).toBe("VERY_STRONG");
    expect(matchStrengthFromScore(90)).toBe("VERY_STRONG");
    expect(matchStrengthFromScore(89.99)).toBe("STRONG");
    expect(matchStrengthFromScore(75)).toBe("STRONG");
    expect(matchStrengthFromScore(74.99)).toBe("POSSIBLE");
    expect(matchStrengthFromScore(60)).toBe("POSSIBLE");
  });
});

const { ActivityPage } = await import("@/components/kept-account-pages");

describe("matching integrations", () => {
  it("reads the strength filter from the URL", async () => {
    currentSearch = { strength: "STRONG" };
    getMyMatchesMock.mockResolvedValue([match({ strength: "STRONG" })]);
    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");
    expect(getMyMatchesMock).toHaveBeenCalledWith({ strength: "STRONG" });
  });

  it("Home asks for a bounded real preview", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);
    renderWithClient(<HomePage />);
    expect(await screen.findByText("White Apple earbuds")).toBeInTheDocument();
    expect(getMyMatchesMock).toHaveBeenCalledWith({ strength: "ALL", limit: 2 });
  });

  it("Home errors offer retry instead of pretending there are no matches", async () => {
    getMyMatchesMock.mockRejectedValue(new Error("unavailable"));
    renderWithClient(<HomePage />);
    expect(await screen.findByText("We could not load your matches.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText("No matches to show yet.")).not.toBeInTheDocument();
  });

  it("Activity shows real possible matches without a preview notice", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);
    renderWithClient(<ActivityPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Possible Matches" }));
    expect(await screen.findByText("White Apple earbuds")).toBeInTheDocument();
    expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument();
  });

  it("Activity preserves the match and reports a failed dismissal", async () => {
    getMyMatchesMock.mockResolvedValue([match()]);
    dismissMatchMock.mockRejectedValue(new Error("unavailable"));
    renderWithClient(<ActivityPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Possible Matches" }));
    await screen.findByText("White Apple earbuds");
    await userEvent.click(screen.getByRole("button", { name: /not my item/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not hide/i);
    expect(screen.getByText("White Apple earbuds")).toBeInTheDocument();
  });

  it("successful dismissal refetches every match surface and removes the card", async () => {
    getMyMatchesMock.mockResolvedValueOnce([match()]).mockResolvedValue([]);
    renderWithClient(<MatchesPage />);
    await screen.findByText("White Apple earbuds");
    await userEvent.click(screen.getByRole("button", { name: /not my item/i }));
    expect(await screen.findByText(/no strong matches yet/i)).toBeInTheDocument();
    expect(screen.queryByText("White Apple earbuds")).not.toBeInTheDocument();
  });

  it("per-item caches are isolated by user identity", async () => {
    const { matchKeys } = await import("@/hooks/use-matches");
    expect(matchKeys.forItem("user-a", "item-1", 3)).not.toEqual(
      matchKeys.forItem("user-b", "item-1", 3),
    );
  });
});

describe("listing changes refresh matches", () => {
  it("closing a listing invalidates cached matches on every surface", async () => {
    const { useCloseItem } = await import("@/hooks/use-listings");
    const { matchKeys } = await import("@/hooks/use-matches");
    const client = new QueryClient();
    const accountKey = matchKeys.mine("user-a", "ALL");
    const itemKey = matchKeys.forItem("user-a", "lost-1", 3);
    client.setQueryData(accountKey, [match()]);
    client.setQueryData(itemKey, [match()]);
    const { result } = renderHook(() => useCloseItem(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await act(async () => {
      await result.current.mutateAsync({ itemId: "lost-1" });
    });
    expect(client.getQueryState(accountKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(itemKey)?.isInvalidated).toBe(true);
    client.clear();
  });
});
