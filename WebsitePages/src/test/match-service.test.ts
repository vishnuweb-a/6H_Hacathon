import { beforeEach, describe, expect, it, vi } from "vitest";
const rpcMock = vi.fn();
const coversMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: () => ({ rpc: rpcMock }) }));
vi.mock("@/lib/services/listing-service", () => ({
  getListingCoverUrls: (...args: unknown[]) => coversMock(...args),
}));
const { getMyMatches, getMatchesForItem } = await import("@/lib/services/match-service");
const row = {
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
};
beforeEach(() => {
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ data: [row], error: null });
  coversMock.mockResolvedValue(new Map([["f", "https://example.test/cover.jpg"]]));
});
describe("match service boundary", () => {
  it("loads cover photos in one batch and narrows untrusted rows to the safe DTO", async () => {
    rpcMock.mockResolvedValue({
      data: [{ ...row, latitude: 12.9716, private_notes: "PRIVATE-EVIDENCE-MARKER" }],
      error: null,
    });
    const results = await getMyMatches({ limit: 2 });
    expect(coversMock).toHaveBeenCalledOnce();
    expect(coversMock).toHaveBeenCalledWith(["f"]);
    expect(results[0]?.otherListing.coverImageUrl).toBe("https://example.test/cover.jpg");
    expect(results[0]?.overallScore).toBe(89.67);
    expect(JSON.stringify(results)).not.toMatch(/latitude|PRIVATE-EVIDENCE-MARKER/);
  });
  it("keeps valid matches usable when optional media fails", async () => {
    coversMock.mockRejectedValue(new Error("media unavailable"));
    const results = await getMatchesForItem("l");
    expect(results[0]?.id).toBe("m");
    expect(results[0]?.otherListing.coverImageUrl).toBeNull();
  });
  it("surfaces match-read failures without fetching media", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "Match read failed" } });
    await expect(getMyMatches()).rejects.toThrow("Match read failed");
    expect(coversMock).not.toHaveBeenCalled();
  });
});
