/**
 * Explore search, filter, sort and pagination tests (Phase 3).
 *
 * Two layers are covered, and the split is deliberate:
 *
 *   1. The URL contract (`validateExploreSearch` and friends) as pure functions —
 *      hydration, normalisation and the hostile-input cases. These are the cheapest
 *      place to assert that a hand-edited URL cannot produce a broken board.
 *   2. The screen, with the router's `useSearch` / `useNavigate` mocked so a filter
 *      click can be observed as the navigation it performs. The assertion is that
 *      the control writes to the URL — not that it mutates local state — because
 *      the URL is what makes the board shareable and reload-safe.
 *
 * The service is mocked throughout: what is under test here is that the UI asks
 * the service for the right page, not the SQL, which the pgTAP suite covers.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import {
  clearedExploreSearch,
  hasActiveExploreFilters,
  searchToExploreFilters,
  validateExploreSearch,
  type ExploreSearch,
} from "@/lib/explore-search";
import {
  decodeExploreCursor,
  encodeExploreCursor,
  normalizeExploreFilters,
} from "@/lib/services/listing-types";
import type { CursorPage, ListingSummary } from "@/lib/services/listing-types";

const getExploreItemsMock = vi.fn();
const navigateMock = vi.fn();

/** The search object the mocked router hands the screen; set per test. */
let currentSearch: ExploreSearch = {};

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
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

vi.mock("@/lib/services/listing-service", () => ({
  getExploreItems: (...args: unknown[]) => getExploreItemsMock(...args),
  getItemById: vi.fn(),
  getMyItemDetail: vi.fn(),
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

const { ExplorePage } = await import("@/components/kept-board-pages");

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

function page(
  data: ListingSummary[],
  overrides: Partial<CursorPage<ListingSummary>> = {},
): CursorPage<ListingSummary> {
  return { data, nextCursor: null, hasMore: false, ...overrides };
}

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** The filters the screen passed to the service on its most recent call. */
function lastFilters() {
  return getExploreItemsMock.mock.calls.at(-1)?.[0];
}

/** The search patch the screen most recently navigated to. */
function lastNavigatedSearch(): ExploreSearch {
  const call = navigateMock.mock.calls.at(-1)?.[0];
  return typeof call?.search === "function" ? call.search(currentSearch) : call?.search;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearch = {};
  getExploreItemsMock.mockResolvedValue(page([summary()]));
});

// This project's vitest setup does not install RTL's automatic cleanup, so each
// test unmounts its own tree. Without it, every rendered board stays in the
// document and a query like "Search items" matches several nodes at once.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// The URL contract
// ---------------------------------------------------------------------------

describe("validateExploreSearch", () => {
  it("hydrates a full board from the URL", () => {
    expect(
      validateExploreSearch({
        q: "airpods",
        type: "FOUND",
        category: "electronics",
        from: "2026-09-01",
        to: "2026-09-30",
        location: "Library",
        sort: "OLDEST",
        limit: 30,
        view: "list",
      }),
    ).toEqual({
      q: "airpods",
      type: "FOUND",
      category: "electronics",
      from: "2026-09-01",
      to: "2026-09-30",
      location: "Library",
      sort: "OLDEST",
      limit: 30,
      view: "list",
    });
  });

  it("returns an empty board for an empty URL rather than throwing", () => {
    expect(validateExploreSearch({})).toEqual({});
  });

  // Each of these is a URL somebody can type, so none may produce an error page.
  it("drops an unknown listing type", () => {
    expect(validateExploreSearch({ type: "STOLEN" }).type).toBeUndefined();
  });

  it("drops a category outside the product vocabulary", () => {
    expect(validateExploreSearch({ category: "spaceships" }).category).toBeUndefined();
  });

  it("keeps a category that is in the vocabulary", () => {
    expect(validateExploreSearch({ category: "keys" }).category).toBe("keys");
  });

  it("drops a malformed date", () => {
    expect(validateExploreSearch({ from: "yesterday" }).from).toBeUndefined();
    expect(validateExploreSearch({ from: "2026-13-45" }).from).toBeUndefined();
    expect(validateExploreSearch({ to: "2026-02-30" }).to).toBeUndefined();
  });

  it("drops a reversed date range instead of returning an empty board", () => {
    const result = validateExploreSearch({ from: "2026-09-30", to: "2026-09-01" });
    expect(result.from).toBe("2026-09-30");
    expect(result.to).toBeUndefined();
  });

  it("treats a non-string query as absent", () => {
    expect(validateExploreSearch({ q: 42 }).q).toBeUndefined();
    expect(validateExploreSearch({ q: ["a", "b"] }).q).toBeUndefined();
  });

  it("trims and bounds the query text", () => {
    expect(validateExploreSearch({ q: "   hoodie   " }).q).toBe("hoodie");
    expect(validateExploreSearch({ q: "   " }).q).toBeUndefined();
    expect(validateExploreSearch({ q: "x".repeat(500) }).q).toHaveLength(120);
  });

  it("clamps the page size to the documented maximum", () => {
    expect(validateExploreSearch({ limit: 9999 }).limit).toBe(50);
    expect(validateExploreSearch({ limit: -5 }).limit).toBe(1);
    expect(validateExploreSearch({ limit: "abc" }).limit).toBeUndefined();
  });

  // Defaults are represented by an absent key, so two URLs meaning the same board
  // normalise to one object and therefore to one cache entry.
  it("omits the default sort and page size", () => {
    expect(validateExploreSearch({ sort: "NEWEST" }).sort).toBeUndefined();
    expect(validateExploreSearch({ limit: 20 }).limit).toBeUndefined();
  });

  it("is idempotent, so re-validating a URL does not change it", () => {
    const once = validateExploreSearch({ q: " hoodie ", type: "LOST", sort: "NEWEST" });
    expect(validateExploreSearch({ ...once })).toEqual(once);
  });
});

describe("searchToExploreFilters", () => {
  it("maps the URL shape onto the service filter shape", () => {
    expect(
      searchToExploreFilters({
        q: "airpods",
        type: "LOST",
        category: "electronics",
        from: "2026-09-01",
        to: "2026-09-30",
        location: "Library",
        sort: "OLDEST",
      }),
    ).toEqual({
      query: "airpods",
      listingType: "LOST",
      category: "electronics",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      locationQuery: "Library",
      sort: "OLDEST",
    });
  });

  it("defaults an absent type to ALL and an absent sort to NEWEST", () => {
    const filters = searchToExploreFilters({});
    expect(filters.listingType).toBe("ALL");
    expect(filters.sort).toBe("NEWEST");
  });
});

describe("hasActiveExploreFilters", () => {
  it("is false for a board with no narrowing", () => {
    expect(hasActiveExploreFilters({})).toBe(false);
    // Presentation choices are not filters: the view toggle must not turn the
    // "board is empty" state into "nothing matches your search".
    expect(hasActiveExploreFilters({ view: "list" })).toBe(false);
    expect(hasActiveExploreFilters({ sort: "OLDEST" })).toBe(false);
  });

  it("is true for each narrowing filter", () => {
    expect(hasActiveExploreFilters({ q: "hoodie" })).toBe(true);
    expect(hasActiveExploreFilters({ type: "LOST" })).toBe(true);
    expect(hasActiveExploreFilters({ category: "keys" })).toBe(true);
    expect(hasActiveExploreFilters({ from: "2026-09-01" })).toBe(true);
    expect(hasActiveExploreFilters({ to: "2026-09-30" })).toBe(true);
    expect(hasActiveExploreFilters({ location: "Library" })).toBe(true);
  });
});

describe("clearedExploreSearch", () => {
  it("clears the filters but keeps how the board is being viewed", () => {
    expect(
      clearedExploreSearch({
        q: "hoodie",
        type: "LOST",
        category: "keys",
        from: "2026-09-01",
        location: "Library",
        view: "list",
        limit: 30,
      }),
    ).toEqual({ view: "list", limit: 30 });
  });
});

describe("normalizeExploreFilters", () => {
  it("collapses equivalent spellings of the same board to one shape", () => {
    expect(normalizeExploreFilters({ query: "  hoodie  ", listingType: "ALL" })).toEqual(
      normalizeExploreFilters({ query: "hoodie", listingType: undefined }),
    );
  });

  it("drops ALL and empty strings so they cannot become filters", () => {
    const result = normalizeExploreFilters({ query: "   ", listingType: "ALL", category: "ALL" });
    expect(result).toEqual({ sort: "NEWEST" });
  });

  it("always resolves a sort, so the ordering is never left to the server default", () => {
    expect(normalizeExploreFilters({}).sort).toBe("NEWEST");
    expect(normalizeExploreFilters({ sort: "OLDEST" }).sort).toBe("OLDEST");
  });
});

describe("explore cursor", () => {
  it("round-trips a cursor", () => {
    const cursor = {
      createdAt: "2026-10-06T10:00:00.000Z",
      id: "3f3f3f3f-1111-4222-8333-444444444444",
    };
    expect(decodeExploreCursor(encodeExploreCursor(cursor))).toEqual(cursor);
  });

  // A cursor travels through a URL, so a tampered one must mean "first page".
  it("rejects a malformed cursor rather than throwing", () => {
    expect(decodeExploreCursor(null)).toBeNull();
    expect(decodeExploreCursor("")).toBeNull();
    expect(decodeExploreCursor("nonsense")).toBeNull();
    expect(decodeExploreCursor("|")).toBeNull();
    expect(decodeExploreCursor("not-a-date|3f3f3f3f-1111-4222-8333-444444444444")).toBeNull();
    expect(decodeExploreCursor("2026-10-06T10:00:00.000Z|not-a-uuid")).toBeNull();
    expect(decodeExploreCursor("2026-10-06T10:00:00.000Z|")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

describe("ExplorePage URL state", () => {
  it("hydrates its controls from the URL on first render", async () => {
    currentSearch = { q: "airpods", type: "LOST", category: "electronics", sort: "OLDEST" };
    renderWithQuery(<ExplorePage />);

    expect(await screen.findByLabelText("Search items")).toHaveValue("airpods");
    expect(screen.getByLabelText("Category")).toHaveValue("electronics");
    expect(screen.getByLabelText("Sort order")).toHaveValue("OLDEST");
    expect(screen.getByRole("button", { name: "Lost" })).toHaveAttribute("aria-pressed", "true");
  });

  it("queries the service with the filters from the URL, not with defaults", async () => {
    currentSearch = { q: "airpods", type: "LOST", category: "electronics", sort: "OLDEST" };
    renderWithQuery(<ExplorePage />);

    await waitFor(() => expect(getExploreItemsMock).toHaveBeenCalled());
    expect(lastFilters()).toMatchObject({
      query: "airpods",
      listingType: "LOST",
      category: "electronics",
      sort: "OLDEST",
    });
  });

  it("writes the listing type filter to the URL", async () => {
    renderWithQuery(<ExplorePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Found" }));

    expect(navigateMock).toHaveBeenCalled();
    expect(lastNavigatedSearch()).toMatchObject({ type: "FOUND" });
  });

  it("removes the listing type from the URL when All items is chosen", async () => {
    currentSearch = { type: "FOUND" };
    renderWithQuery(<ExplorePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "All items" }));

    expect(lastNavigatedSearch().type).toBeUndefined();
  });

  it("writes the category filter to the URL", async () => {
    renderWithQuery(<ExplorePage />);
    await userEvent.setup().selectOptions(await screen.findByLabelText("Category"), "keys");

    expect(lastNavigatedSearch()).toMatchObject({ category: "keys" });
  });

  it("writes the sort order to the URL and omits the default", async () => {
    renderWithQuery(<ExplorePage />);
    await userEvent.setup().selectOptions(await screen.findByLabelText("Sort order"), "OLDEST");
    expect(lastNavigatedSearch()).toMatchObject({ sort: "OLDEST" });

    currentSearch = { sort: "OLDEST" };
    await userEvent.setup().selectOptions(screen.getByLabelText("Sort order"), "NEWEST");
    expect(lastNavigatedSearch().sort).toBeUndefined();
  });

  it("writes the date range to the URL as event-date bounds", async () => {
    renderWithQuery(<ExplorePage />);
    const from = await screen.findByLabelText("Lost or found on or after");
    await userEvent.setup().type(from, "2026-09-01");

    await waitFor(() => expect(lastNavigatedSearch()).toMatchObject({ from: "2026-09-01" }));
  });

  it("debounces typing into one URL write rather than one per keystroke", async () => {
    // Real timers: RTL's findBy* polling cannot advance under fake ones, and the
    // behaviour under test is observable without them — six keystrokes must not
    // become six navigations, and the committed value must be the whole word.
    const user = userEvent.setup();
    renderWithQuery(<ExplorePage />);
    const input = await screen.findByLabelText("Search items");

    await user.type(input, "hoodie");
    expect(input).toHaveValue("hoodie");
    // Still inside the debounce window: typing has not written to the URL yet.
    expect(navigateMock).not.toHaveBeenCalled();

    await waitFor(() => expect(navigateMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(lastNavigatedSearch()).toMatchObject({ q: "hoodie" });
  });

  it("follows the URL when it changes externally, as Back/Forward does", async () => {
    const { rerender } = renderWithQuery(<ExplorePage />);
    expect(await screen.findByLabelText("Search items")).toHaveValue("");

    // A Back step is an external change to the search object.
    currentSearch = { q: "calculator" };
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ExplorePage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("Search items")).toHaveValue("calculator"));
  });

  it("keeps the view toggle in the URL so a shared link opens the same layout", async () => {
    renderWithQuery(<ExplorePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "List view" }));
    expect(lastNavigatedSearch()).toMatchObject({ view: "list" });
  });
});

describe("ExplorePage states", () => {
  it("shows a loading state before the first page resolves", () => {
    getExploreItemsMock.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<ExplorePage />);
    expect(screen.getByText("Loading items…")).toBeInTheDocument();
  });

  it("renders the listings once they load", async () => {
    getExploreItemsMock.mockResolvedValue(page([summary({ title: "Blue umbrella" })]));
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByText("Blue umbrella")).toBeInTheDocument();
  });

  // The two empty states are different messages because the remedies differ.
  it("distinguishes an empty board from a search that matched nothing", async () => {
    getExploreItemsMock.mockResolvedValue(page([]));
    const { unmount } = renderWithQuery(<ExplorePage />);
    expect(await screen.findByText("The board is empty.")).toBeInTheDocument();
    unmount();

    currentSearch = { q: "nothing matches this" };
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByText("Nothing matches that search.")).toBeInTheDocument();
  });

  it("offers a reset that clears the filters from the URL", async () => {
    getExploreItemsMock.mockResolvedValue(page([]));
    currentSearch = { q: "hoodie", type: "LOST", category: "keys", view: "list" };
    renderWithQuery(<ExplorePage />);

    await userEvent.setup().click(await screen.findByRole("button", { name: "Clear filters" }));
    const next = lastNavigatedSearch();
    expect(next.q).toBeUndefined();
    expect(next.type).toBeUndefined();
    expect(next.category).toBeUndefined();
    // Resetting filters is not a request to change how the board is displayed.
    expect(next.view).toBe("list");
  });

  it("shows an error state with a retry rather than an empty board", async () => {
    getExploreItemsMock.mockRejectedValue(new Error("boom"));
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByText("The board did not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("ExplorePage pagination", () => {
  it("offers Load More only while a further page exists", async () => {
    getExploreItemsMock.mockResolvedValue(
      page([summary()], { hasMore: true, nextCursor: "2026-10-06T10:00:00.000Z|item-1" }),
    );
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("reports the end of the board instead of a dead Load More button", async () => {
    getExploreItemsMock.mockResolvedValue(page([summary()]));
    renderWithQuery(<ExplorePage />);
    expect(await screen.findByText(/THAT’S EVERYTHING ON THE BOARD/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("appends the next page and keeps the rows already on screen", async () => {
    const cursor = "2026-10-06T10:00:00.000Z|3f3f3f3f-1111-4222-8333-444444444444";
    getExploreItemsMock
      .mockResolvedValueOnce(
        page([summary({ id: "item-1", title: "First page item" })], {
          hasMore: true,
          nextCursor: cursor,
        }),
      )
      .mockResolvedValueOnce(page([summary({ id: "item-2", title: "Second page item" })]));

    renderWithQuery(<ExplorePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /load more/i }));

    expect(await screen.findByText("Second page item")).toBeInTheDocument();
    // The point of Load More: the first page is still there.
    expect(screen.getByText("First page item")).toBeInTheDocument();
  });

  it("passes the cursor from the previous page to the next request", async () => {
    const cursor = "2026-10-06T10:00:00.000Z|3f3f3f3f-1111-4222-8333-444444444444";
    getExploreItemsMock
      .mockResolvedValueOnce(page([summary()], { hasMore: true, nextCursor: cursor }))
      .mockResolvedValueOnce(page([summary({ id: "item-2" })]));

    renderWithQuery(<ExplorePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /load more/i }));

    await waitFor(() => expect(getExploreItemsMock).toHaveBeenCalledTimes(2));
    expect(getExploreItemsMock.mock.calls[1]?.[1]).toMatchObject({ cursor });
  });

  it("keeps the loaded rows when a Load More fails", async () => {
    getExploreItemsMock
      .mockResolvedValueOnce(
        page([summary({ title: "Still here" })], {
          hasMore: true,
          nextCursor: "2026-10-06T10:00:00.000Z|3f3f3f3f-1111-4222-8333-444444444444",
        }),
      )
      .mockRejectedValueOnce(new Error("page failed"));

    renderWithQuery(<ExplorePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /load more/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/THAT PAGE DID NOT LOAD/i);
    expect(screen.getByText("Still here")).toBeInTheDocument();
  });

  it("requests the page size from the URL when one is given", async () => {
    currentSearch = { limit: 50 };
    renderWithQuery(<ExplorePage />);
    await waitFor(() => expect(getExploreItemsMock).toHaveBeenCalled());
    expect(getExploreItemsMock.mock.calls[0]?.[1]).toMatchObject({ limit: 50 });
  });
});
