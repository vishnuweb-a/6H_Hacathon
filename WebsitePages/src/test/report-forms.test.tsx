/**
 * Lost Report and Found Listing form tests.
 *
 * Covers validation, the public/private separation the Found form must preserve,
 * verification questions, the success and error states, and that the client never
 * submits a user id of its own.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const createLostItemMock = vi.fn();
const createFoundItemMock = vi.fn();

// `Button asChild` clones its single child and passes props down, so the Link stand-in
// must render a real anchor that accepts them.
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
  createLostItem: (...args: unknown[]) => createLostItemMock(...args),
  createFoundItem: (...args: unknown[]) => createFoundItemMock(...args),
  getExploreItems: vi.fn(),
  getItemById: vi.fn(),
  getMyItemDetail: vi.fn(),
  getMyItems: vi.fn(async () => []),
  updateMyItem: vi.fn(),
  closeMyItem: vi.fn(),
  cancelMyItem: vi.fn(),
  uploadItemImages: vi.fn(),
  deleteItemImage: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ removeAllChannels: vi.fn(async () => []) }),
}));

const { ReportPage } = await import("@/components/kept-report-pages");

function renderReport(kind: "lost" | "found") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportPage kind={kind} />
    </QueryClientProvider>,
  );
}

/** Walks the wizard to the review step with valid values. */
async function fillToReview(user: ReturnType<typeof userEvent.setup>, options: { found: boolean }) {
  await user.type(screen.getByLabelText(/item name/i), "Grey oversized hoodie");
  await user.type(
    screen.getByLabelText(/public description/i),
    "A grey pullover hoodie, size M/L, found near the reading area.",
  );
  await user.click(screen.getByRole("button", { name: /continue/i }));

  // Photo step — optional.
  await user.click(screen.getByRole("button", { name: /continue/i }));

  await user.type(screen.getByLabelText(/approximate location/i), "Central Library");
  await user.click(screen.getByRole("button", { name: /continue/i }));

  await user.type(
    screen.getByLabelText(options.found ? /private notes/i : /distinguishing characteristics/i),
    "Stitched initials inside the collar",
  );
  if (options.found) {
    await user.type(screen.getByLabelText(/question 1/i), "What is stitched inside the collar?");
  }
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportPage validation", () => {
  it("refuses to advance without a title and description", async () => {
    const user = userEvent.setup();
    renderReport("lost");

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/give the item a name/i);
    // Still on step 1 — the wizard did not advance past the invalid step.
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("refuses a description that is too short", async () => {
    const user = userEvent.setup();
    renderReport("lost");

    await user.type(screen.getByLabelText(/item name/i), "Hoodie");
    await user.type(screen.getByLabelText(/public description/i), "grey");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 10 characters/i);
  });

  it("requires at least one private detail", async () => {
    const user = userEvent.setup();
    renderReport("found");

    await user.type(screen.getByLabelText(/item name/i), "Grey oversized hoodie");
    await user.type(
      screen.getByLabelText(/public description/i),
      "A grey pullover hoodie found near the reading area.",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/approximate location/i), "Central Library");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least one private detail/i);
  });

  it("rejects a verification question that is too short", async () => {
    const user = userEvent.setup();
    renderReport("found");

    await user.type(screen.getByLabelText(/item name/i), "Grey oversized hoodie");
    await user.type(
      screen.getByLabelText(/public description/i),
      "A grey pullover hoodie found near the reading area.",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/approximate location/i), "Central Library");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText(/private notes/i), "Initials inside");
    await user.type(screen.getByLabelText(/question 1/i), "huh");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 5 characters/i);
  });
});

describe("ReportPage private separation", () => {
  it("labels the private step as never published, and the public step as public", async () => {
    const user = userEvent.setup();
    renderReport("found");
    await fillToReview(user, { found: true });

    // Review step shows both blocks, clearly separated.
    expect(screen.getByText(/public on the board/i)).toBeInTheDocument();
    expect(screen.getByText(/private · not published/i)).toBeInTheDocument();
  });

  it("sends private details and questions under privateDetails, not in the description", async () => {
    const user = userEvent.setup();
    createFoundItemMock.mockResolvedValue({
      itemId: "item-1",
      listingType: "FOUND",
      status: "ACTIVE",
      createdAt: "2026-10-07T10:00:00.000Z",
      failedImageCount: 0,
    });

    renderReport("found");
    await fillToReview(user, { found: true });
    await user.click(screen.getByRole("button", { name: /publish found report/i }));

    expect(await screen.findByText(/your report is on the board/i)).toBeInTheDocument();

    const input = createFoundItemMock.mock.calls[0]?.[0] as {
      description: string;
      privateDetails: { privateNotes: string | null };
      verificationQuestions: Array<{ question: string; position: number }>;
    };
    expect(input.privateDetails.privateNotes).toBe("Stitched initials inside the collar");
    expect(input.description).not.toContain("Stitched initials");
    expect(input.verificationQuestions).toEqual([
      { question: "What is stitched inside the collar?", position: 0 },
    ]);
  });

  it("persists the LOST wizard's private distinguishing characteristics", async () => {
    const user = userEvent.setup();
    createLostItemMock.mockResolvedValue({
      itemId: "item-lost-private",
      listingType: "LOST",
      status: "ACTIVE",
      createdAt: "2026-10-07T10:00:00.000Z",
      failedImageCount: 0,
    });

    renderReport("lost");
    await fillToReview(user, { found: false });
    await user.click(screen.getByRole("button", { name: /publish lost report/i }));

    await screen.findByText(/your report is on the board/i);

    const input = createLostItemMock.mock.calls[0]?.[0] as {
      description: string;
      privateDetails?: { privateNotes: string | null };
    };

    // They used to be dropped at submit; they now travel to the service, which
    // writes them to lost_item_private_details.
    expect(input.privateDetails?.privateNotes).toBe("Stitched initials inside the collar");
    // ...and they must not leak into the published description.
    expect(input.description).not.toContain("Stitched initials");
  });

  it("never includes a user id in the submitted input", async () => {
    const user = userEvent.setup();
    createLostItemMock.mockResolvedValue({
      itemId: "item-2",
      listingType: "LOST",
      status: "ACTIVE",
      createdAt: "2026-10-07T10:00:00.000Z",
      failedImageCount: 0,
    });

    renderReport("lost");
    await fillToReview(user, { found: false });
    await user.click(screen.getByRole("button", { name: /publish lost report/i }));

    await screen.findByText(/your report is on the board/i);

    const input = createLostItemMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(input)).not.toContain("userId");
    expect(Object.keys(input)).not.toContain("user_id");
    expect(Object.keys(input)).not.toContain("status");
    expect(Object.keys(input)).not.toContain("listingType");
  });
});

describe("ReportPage submission states", () => {
  it("shows a success screen linking to the new listing", async () => {
    const user = userEvent.setup();
    createLostItemMock.mockResolvedValue({
      itemId: "item-3",
      listingType: "LOST",
      status: "ACTIVE",
      createdAt: "2026-10-07T10:00:00.000Z",
      failedImageCount: 0,
    });

    renderReport("lost");
    await fillToReview(user, { found: false });
    await user.click(screen.getByRole("button", { name: /publish lost report/i }));

    expect(await screen.findByText(/your report is on the board/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view your listing/i })).toBeInTheDocument();
  });

  it("surfaces a backend failure instead of claiming success", async () => {
    const user = userEvent.setup();
    createLostItemMock.mockRejectedValue(new Error("We could not publish your report."));

    renderReport("lost");
    await fillToReview(user, { found: false });
    await user.click(screen.getByRole("button", { name: /publish lost report/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not publish/i);
    expect(screen.queryByText(/your report is on the board/i)).not.toBeInTheDocument();
  });

  it("says plainly when a photo could not be uploaded", async () => {
    const user = userEvent.setup();
    createLostItemMock.mockResolvedValue({
      itemId: "item-4",
      listingType: "LOST",
      status: "ACTIVE",
      createdAt: "2026-10-07T10:00:00.000Z",
      failedImageCount: 1,
    });

    renderReport("lost");
    await fillToReview(user, { found: false });
    await user.click(screen.getByRole("button", { name: /publish lost report/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/one photo could not be uploaded/i);
  });

  it("does not submit twice when the publish button is clicked twice", async () => {
    const user = userEvent.setup();
    let resolve: ((value: unknown) => void) | undefined;
    createLostItemMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );

    renderReport("lost");
    await fillToReview(user, { found: false });

    const publish = screen.getByRole("button", { name: /publish lost report/i });
    await user.click(publish);
    // The button is disabled while in flight, so a second click cannot land.
    expect(screen.getByRole("button", { name: /publishing/i })).toBeDisabled();

    resolve?.({
      itemId: "item-5",
      listingType: "LOST",
      status: "ACTIVE",
      createdAt: "2026-10-07T10:00:00.000Z",
      failedImageCount: 0,
    });
    await screen.findByText(/your report is on the board/i);
    expect(createLostItemMock).toHaveBeenCalledTimes(1);
  });
});
