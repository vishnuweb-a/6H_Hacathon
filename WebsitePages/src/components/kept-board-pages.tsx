import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Sparkles,
  ShieldCheck,
  Heart,
  MapPin,
  Grid2X2,
  List,
  Check,
  Star,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Page, Badge, Tabs, SectionHeading, TrustNote } from "./kept-shared";
import {
  ListingCard,
  ListingErrorState,
  ListingGridSkeleton,
  ListingImage as ListingPhoto,
  ListingEmptyState,
  listingDateLabel,
} from "./kept-listing-ui";
import { items, dateLabel } from "@/lib/kept-data";
import { useAuth } from "@/lib/auth-context";
import {
  useExploreItems,
  useInfiniteExploreItems,
  useItem,
  useMyItemDetail,
} from "@/hooks/use-listings";
import {
  clearedExploreSearch,
  hasActiveExploreFilters,
  searchToExploreFilters,
  validateExploreSearch,
  type ExploreSearch,
} from "@/lib/explore-search";
import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  STATUS_LABELS,
  categoryLabel,
  type ExploreFilters,
  type ListingType,
} from "@/lib/services/listing-types";

/**
 * How many listings the landing strip asks the database for.
 *
 * The strip shows four. It reads the same Explore service as the board — one
 * source of truth for listings — but with its own limit, so the home page costs a
 * four-row page rather than a full Explore page it would then throw away.
 */
const HOME_STRIP_SIZE = 4;

export function HomePage() {
  const [tab, setTab] = useState<ListingType | "ALL">("ALL");
  // The landing hero art is static editorial imagery from the approved design, not
  // listing data. The board strip below it reads real listings.
  const {
    data: fresh,
    isPending: freshPending,
    isError: freshError,
  } = useExploreItems({ listingType: tab }, { limit: HOME_STRIP_SIZE });
  return (
    <main>
      <section className="grid-paper border-b-2 border-foreground">
        <div className="page-width py-14 grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <div className="eyebrow flex items-center gap-2 mb-6">
              <span className="w-2 h-2 bg-purple rounded-full" />
              THE CAMPUS LOST & FOUND, REIMAGINED.
            </div>
            <h1 className="hero-title display">
              Lost something?
              <br />
              <span className="relative inline-block">
                Check the board.
                <span className="absolute h-3 bg-pink -bottom-2 left-0 w-full -z-0" />
              </span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed">
              Your hoodie. Your calculator. Your lucky water bottle.
              <br className="hidden lg:block" /> Good things have a way of finding their way back.
            </p>
            <div className="flex flex-wrap gap-4 mt-7">
              <Button asChild variant="pink" size="lg">
                <Link to="/post/lost">
                  I lost something <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild variant="lime" size="lg">
                <Link to="/post/found">
                  I found something <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-7 text-xs">
              <div className="flex -space-x-2">
                {["AS", "RM", "MP", "KS"].map((a, i) => (
                  <span
                    key={a}
                    className={`w-7 h-7 rounded-full border-2 border-foreground grid place-content-center text-[9px] font-bold ${i % 2 ? "bg-mint" : "bg-orange"}`}
                  >
                    {a}
                  </span>
                ))}
              </div>
              <p>
                <b>128 things reunited.</b> And counting <span className="text-pink">♥</span>
              </p>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-item hero-item-one">
              <img
                src={items[0].image}
                alt="Grey hoodie found on campus"
                className="item-photo"
                width={512}
                height={512}
              />
              <div className="hero-item-caption flex justify-between">
                <span>Someone's favourite hoodie.</span>
                <Heart size={16} />
              </div>
            </div>
            <div className="hero-item hero-item-two">
              <img
                src={items[1].image}
                alt="Blue calculator waiting to be found"
                className="item-photo"
                width={512}
                height={512}
              />
              <div className="hero-item-caption">Definitely needed for finals. ↗</div>
            </div>
            <div className="hero-burst">
              NOT LOST.
              <br />
              JUST NOT
              <br />
              HOME YET.
            </div>
            <div className="return-sticker sticker bg-paper px-4 py-3 flex gap-2 items-center text-sm font-bold">
              <span className="bg-lime p-1">
                <Check size={18} />
              </span>
              Less panic. More happy endings.
            </div>
            <svg
              className="absolute bottom-14 -left-7 hero-arrow"
              viewBox="0 0 100 75"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 10C15 55 60 5 85 53M68 49l19 8 5-21"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </div>
        </div>
      </section>
      <section className="border-b-2 border-foreground bg-paper">
        <div className="page-width py-5 grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            [ShieldCheck, "College-verified community"],
            [Heart, "People, not just posts"],
            [MapPin, "Privacy comes first"],
            [Sparkles, "A little kindness goes far"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Heart;
            return (
              <div key={String(text)} className="flex items-center gap-3 text-xs font-semibold">
                <I size={19} />
                {String(text)}
              </div>
            );
          })}
        </div>
      </section>
      <section className="page-width py-11">
        <SectionHeading kicker="A LITTLE FAMILIAR?" title="These might be yours." to="/matches" />
        <div className="grid md:grid-cols-[1fr_1fr_0.85fr] gap-5">
          {[items[0], items[5]].map((item, i) => (
            <Link
              key={item.id}
              to="/listing/$id"
              params={{ id: item.id }}
              className="panel p-4 flex gap-4 bg-paper"
            >
              <div className={`w-28 h-32 shrink-0 ${i ? "bg-purple/15" : "bg-pink/20"}`}>
                <img
                  src={item.image}
                  alt={item.title}
                  className="item-photo"
                  width={512}
                  height={512}
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col justify-between">
                <Badge tone={i ? "orange" : "lime"}>
                  <Sparkles size={11} />
                  {i ? "POSSIBLE MATCH" : "STRONG MATCH"}
                </Badge>
                <h3 className="font-bold text-lg mt-2">{item.title}</h3>
                <p className="text-xs flex gap-1 items-center mt-2">
                  <MapPin size={12} />
                  {item.location}
                </p>
                <span className="text-xs underline mt-3 font-bold">Take a closer look ↗</span>
              </div>
            </Link>
          ))}
          <div className="bg-purple text-primary-foreground border-2 border-foreground p-5 relative">
            <Sparkles className="absolute top-4 right-4" size={26} />
            <p className="eyebrow mb-3">YOUR THINGS MISS YOU, TOO.</p>
            <h3 className="text-xl font-bold leading-tight max-w-52">
              The right match could be one post away.
            </h3>
            <Link
              to="/post/lost"
              className="text-xs font-bold underline mt-5 inline-flex gap-2 items-center"
            >
              Report a lost item <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      <section className="page-width pt-3 pb-10">
        <SectionHeading
          kicker="FRESH ON THE BOARD"
          title="Lost. Found. Waiting for you."
          to="/explore"
        />
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2" role="group" aria-label="Listing type">
            {(
              [
                ["ALL", "All items"],
                ["LOST", "Lost"],
                ["FOUND", "Found"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={tab === value ? "default" : "outline"}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <span className="eyebrow text-muted-foreground hidden sm:block">
            GOOD FINDS. GOOD PEOPLE.
          </span>
        </div>
        {freshPending ? (
          <ListingGridSkeleton count={4} />
        ) : freshError ? (
          <ListingErrorState
            title="The board did not load."
            description="We could not reach the board just now. Try the full board instead."
          />
        ) : (fresh?.data.length ?? 0) > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {fresh?.data.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <ListingEmptyState
            title="Nothing on the board yet."
            description="Be the first to post something lost or found."
            action={
              <Button asChild variant="pink">
                <Link to="/post">
                  Post an item <ArrowUpRight />
                </Link>
              </Button>
            }
          />
        )}
      </section>
      <section className="bg-mint border-y-2 border-foreground">
        <div className="page-width py-9">
          <SectionHeading kicker="THE BEST PART" title="Back where they belong." to="/activity" />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ["AirPods, reunited.", "“I was sure they were gone. This campus is the best.”", "IR"],
              ["One less lost ID.", "“Found, verified, returned. Made my whole week.”", "MP"],
              ["Bottle back in action.", "“A small thing, a really big relief. Thank you!”", "RM"],
            ].map(([title, quote, a]) => (
              <div key={title} className="border-t-2 border-foreground pt-5">
                <div className="flex justify-between">
                  <h3 className="font-bold">{title}</h3>
                  <Heart size={18} />
                </div>
                <p className="text-sm my-3">{quote}</p>
                <div className="eyebrow flex gap-2 items-center">
                  <span className="rounded-full bg-paper border border-foreground p-1">{a}</span>
                  ANOTHER HAPPY RETURN <Star size={12} fill="currentColor" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
/**
 * The campus board, backed by real Supabase data.
 *
 * Filter state is the URL (`useSearch` / `navigate({ search })`), not component
 * state: a reload, a Back step and a shared link all rebuild the same board. The
 * only local state is the uncommitted text in the search box, which is debounced
 * into the URL so typing does not push a request or a history entry per keystroke.
 *
 * Every narrowing happens in PostgreSQL. The query key carries the normalised
 * filters, so changing one starts a new first page rather than slicing a cached
 * set, and only ACTIVE listings are discoverable (pinned in the service) — a
 * closed, cancelled, returned or in-recovery listing cannot appear here.
 */
export function ExplorePage() {
  const search = useSearch({ from: "/explore" });
  const navigate = useNavigate({ from: "/explore" });

  // The input is the one piece of state the URL should lag behind: it updates per
  // keystroke, the URL updates once typing settles.
  const [queryInput, setQueryInput] = useState(search.q ?? "");

  const setSearch = useCallback(
    (patch: Partial<ExploreSearch>) => {
      void navigate({
        search: (prev: ExploreSearch) => validateExploreSearch({ ...prev, ...patch }),
        // Filtering is not a navigation someone wants to step back through one
        // control at a time, but the resulting board must still be shareable.
        replace: true,
      });
    },
    [navigate],
  );

  // Back/Forward and pasted links are authoritative: when the URL's q changes from
  // outside this component, the box follows it.
  useEffect(() => {
    setQueryInput(search.q ?? "");
  }, [search.q]);

  const committedQuery = search.q ?? "";
  useEffect(() => {
    const trimmed = queryInput.trim();
    if (trimmed === committedQuery) return;
    const timer = setTimeout(() => setSearch({ q: trimmed || undefined }), 300);
    return () => clearTimeout(timer);
  }, [queryInput, committedQuery, setSearch]);

  const filters = useMemo(() => searchToExploreFilters(search), [search]);
  const list = search.view === "list";
  const type = search.type ?? "ALL";
  const category = search.category ?? "ALL";
  const sort = search.sort ?? "NEWEST";

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteExploreItems(filters, { limit: search.limit });

  const listings = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const hasFilters = hasActiveExploreFilters(search);
  // A refetch of the filters, as distinct from loading another page: the former
  // dims the grid, neither blanks it.
  const isFilterTransition = isFetching && !isFetchingNextPage && !isPending;

  const clearFilters = () => {
    setQueryInput("");
    void navigate({ search: () => clearedExploreSearch(search), replace: true });
  };

  return (
    <Page
      eyebrow="THE CAMPUS BOARD / 01"
      title="Someone’s missing this."
      description="A familiar face. A familiar thing. Take a look around."
      action={
        <Button asChild variant="pink">
          <Link to="/post">
            Post an item <ArrowUpRight />
          </Link>
        </Button>
      }
    >
      <div className="panel p-5 mb-8">
        <form
          className="relative mb-5"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ q: queryInput.trim() || undefined });
          }}
        >
          <Search className="absolute left-4 top-3.5" size={20} aria-hidden="true" />
          <input
            className="field pl-12"
            aria-label="Search items"
            placeholder="Hoodie, calculator, water bottle..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </form>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1" role="group" aria-label="Listing type">
            {(
              [
                ["ALL", "All items"],
                ["LOST", "Lost"],
                ["FOUND", "Found"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={type === value ? "lime" : "outline"}
                aria-pressed={type === value}
                onClick={() => setSearch({ type: value === "ALL" ? undefined : value })}
              >
                {label}
              </Button>
            ))}
          </div>
          <select
            aria-label="Category"
            value={category}
            onChange={(e) =>
              setSearch({ category: e.target.value === "ALL" ? undefined : e.target.value })
            }
            className="field w-auto flex-1 min-w-36"
          >
            <option value="ALL">All categories</option>
            {ITEM_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort order"
            value={sort}
            onChange={(e) =>
              setSearch({ sort: e.target.value === "OLDEST" ? "OLDEST" : undefined })
            }
            className="field w-auto flex-1 min-w-36"
          >
            <option value="NEWEST">Newest first</option>
            <option value="OLDEST">Oldest first</option>
          </select>
        </div>
        <details className="mt-4" open={Boolean(search.from ?? search.to ?? search.location)}>
          <summary className="eyebrow cursor-pointer inline-flex items-center gap-2 select-none">
            <SlidersHorizontal size={14} aria-hidden="true" />
            MORE FILTERS
          </summary>
          <div className="flex flex-wrap gap-3 mt-4">
            <label className="flex-1 min-w-44">
              <span className="eyebrow block mb-2">Where</span>
              <input
                className="field"
                aria-label="Filter by location"
                placeholder="Library, canteen, hostel..."
                defaultValue={search.location ?? ""}
                onBlur={(e) => setSearch({ location: e.target.value.trim() || undefined })}
              />
            </label>
            {/* event_date — when the thing was lost or found, not when it was posted. */}
            <label className="flex-1 min-w-36">
              <span className="eyebrow block mb-2">Lost / found after</span>
              <input
                type="date"
                className="field"
                aria-label="Lost or found on or after"
                value={search.from ?? ""}
                max={search.to ?? undefined}
                onChange={(e) => setSearch({ from: e.target.value || undefined })}
              />
            </label>
            <label className="flex-1 min-w-36">
              <span className="eyebrow block mb-2">Lost / found before</span>
              <input
                type="date"
                className="field"
                aria-label="Lost or found on or before"
                value={search.to ?? ""}
                min={search.from ?? undefined}
                onChange={(e) => setSearch({ to: e.target.value || undefined })}
              />
            </label>
          </div>
        </details>
      </div>
      <div className="flex justify-between items-center mb-5">
        <span className="eyebrow" aria-live="polite">
          {isPending
            ? "LOADING THE BOARD…"
            : `${listings.length}${hasNextPage ? "+" : ""} ITEMS ON THE BOARD`}
        </span>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={!list ? "lime" : "outline"}
            aria-label="Grid view"
            aria-pressed={!list}
            onClick={() => setSearch({ view: undefined })}
          >
            <Grid2X2 />
          </Button>
          <Button
            size="icon"
            variant={list ? "lime" : "outline"}
            aria-label="List view"
            aria-pressed={list}
            onClick={() => setSearch({ view: "list" })}
          >
            <List />
          </Button>
        </div>
      </div>
      {isPending ? (
        <ListingGridSkeleton list={list} />
      ) : isError && !listings.length ? (
        <ListingErrorState
          title="The board did not load."
          description="We could not reach the board just now. Nothing is lost — try again."
          onRetry={() => void refetch()}
        />
      ) : listings.length ? (
        <>
          <div
            className={
              list ? "grid gap-4" : "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            }
            aria-busy={isFilterTransition}
            // The current page stays on screen while the next filter resolves —
            // dimmed, not blanked.
            style={isFilterTransition ? { opacity: 0.6 } : undefined}
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} list={list} />
            ))}
          </div>
          {isFetchingNextPage && (
            <div className="mt-5">
              <ListingGridSkeleton list={list} count={4} />
            </div>
          )}
          {/* A failed Load More keeps the rows already on the board. */}
          {isFetchNextPageError && (
            <p className="eyebrow text-pink mt-7 text-center" role="alert">
              THAT PAGE DID NOT LOAD. TRY AGAIN.
            </p>
          )}
          {hasNextPage ? (
            <div className="flex justify-center mt-7">
              <Button
                variant="lime"
                size="lg"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : isFetchNextPageError ? "Try again" : "Load more"}
                {!isFetchingNextPage && <ArrowRight />}
              </Button>
            </div>
          ) : (
            <p className="eyebrow text-muted-foreground mt-7 text-center">
              THAT’S EVERYTHING ON THE BOARD.
            </p>
          )}
        </>
      ) : hasFilters ? (
        <ListingEmptyState
          title="Nothing matches that search."
          description="Try a different search or clear the filters."
          action={
            <Button variant="lime" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ListingEmptyState
          title="The board is empty."
          description="Be the first to post. Someone out there is looking for their thing."
          action={
            <Button asChild variant="pink">
              <Link to="/post">
                Post an item <ArrowUpRight />
              </Link>
            </Button>
          }
        />
      )}
    </Page>
  );
}

/**
 * One listing, from real data.
 *
 * Two reads, deliberately:
 *   - `useItem` returns the public projection, which structurally cannot contain
 *     coordinates or Finder private details.
 *   - `useMyItemDetail` runs only when the viewer is the creator, and is the only
 *     path by which private information reaches the client.
 *
 * A non-owner never receives the private fields, so there is nothing for the UI to
 * remember to hide (docs/securityAndService.md §24).
 */
export function ListingPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: listing, isPending, isError, refetch } = useItem(id);
  const isOwner = Boolean(listing && user?.id === listing.userId);
  const { data: ownerDetail } = useMyItemDetail(id, { enabled: isOwner });

  if (isPending) {
    return (
      <Page eyebrow="THE BOARD / ITEM" title="Loading…">
        <div
          className="grid md:grid-cols-[1.15fr_1fr] gap-9"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">Loading this item’s details…</span>
          <Skeleton className="h-[480px] w-full rounded-none" />
          <div className="space-y-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page eyebrow="THE BOARD / ITEM" title="That did not load.">
        <ListingErrorState onRetry={() => void refetch()} />
      </Page>
    );
  }

  // A listing that does not exist and one the viewer may not see are deliberately
  // the same screen (docs/apiAndDataContracts.md §96 — error privacy).
  if (!listing) {
    return (
      <Page
        eyebrow="NOT ON THE BOARD"
        title="Item not found."
        description="This item may have been closed, or the link may be wrong."
      >
        <Button asChild variant="lime">
          <Link to="/explore">Back to the board</Link>
        </Button>
      </Page>
    );
  }

  const isLost = listing.listingType === "LOST";
  const cover = listing.images[0] ?? null;
  const creator = listing.creator;

  return (
    <Page
      eyebrow={`THE BOARD / ${listing.listingType} ITEM`}
      title={listing.title}
      action={
        <Badge tone={isLost ? "pink" : "lime"}>
          {isLost ? "Lost" : "Found"} · {STATUS_LABELS[listing.status]}
        </Badge>
      }
    >
      <div className="grid md:grid-cols-[1.15fr_1fr] gap-9">
        <div>
          <div className="panel bg-mint/20 h-[320px] sm:h-[480px]">
            <ListingPhoto url={cover?.url ?? null} alt={listing.title} className="h-full w-full" />
          </div>
          {listing.images.length > 1 && (
            <ul className="flex gap-3 mt-4 list-none p-0">
              {listing.images.slice(1).map((image) => (
                <li key={image.id} className="w-24 h-24 border-2 border-foreground bg-mint/20">
                  <ListingPhoto
                    url={image.url}
                    alt={`${listing.title} — another view`}
                    className="h-full w-full"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="eyebrow mb-5">
            {categoryLabel(listing.category)} / POSTED{" "}
            {listingDateLabel(listing.createdAt.slice(0, 10))}
          </div>
          <p className="text-lg leading-relaxed mb-7 whitespace-pre-line">{listing.description}</p>
          {(listing.brand || listing.color) && (
            <p className="eyebrow text-muted-foreground mb-6">
              {[listing.brand, listing.color].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="border-y-2 border-foreground py-5 grid grid-cols-2 gap-5 mb-6">
            <div>
              <p className="eyebrow text-muted-foreground mb-2">APPROXIMATE LOCATION</p>
              <p className="font-bold flex gap-2">
                <MapPin size={17} aria-hidden="true" />
                {listing.locationText}
              </p>
            </div>
            <div>
              <p className="eyebrow text-muted-foreground mb-2">{isLost ? "LAST SEEN" : "FOUND"}</p>
              <p className="font-bold">
                {listingDateLabel(listing.eventDate)}
                {listing.eventTime ? ` · ${listing.eventTime.slice(0, 5)}` : ""}
              </p>
            </div>
          </div>
          <TrustNote>
            Exact locations and identifying details are kept private. Ownership is verified by the
            finder, not by a match score.
          </TrustNote>
          {creator && (
            <div className="flex gap-4 my-6 items-center">
              <span className="bg-orange border-2 border-foreground w-12 h-12 rounded-full grid place-content-center font-bold">
                {creator.displayName.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="font-bold">{creator.displayName}</p>
                <p className="text-xs flex items-center gap-2 mt-1">
                  <ShieldCheck size={14} aria-hidden="true" />
                  {Math.round(creator.trustScore)} trust
                  {creator.averageRating !== null && ` · ★ ${creator.averageRating.toFixed(1)}`}
                </p>
              </div>
              <Link to="/profile" className="ml-auto subtle-link">
                Trust profile
              </Link>
            </div>
          )}
          {/* Owner-only. The private block renders from `ownerDetail`, which a
              non-owner is never given. */}
          {isOwner && ownerDetail ? (
            <div className="grid gap-4">
              {ownerDetail.privateDetails && (
                <div className="bg-purple/10 p-4 border-2 border-foreground">
                  <Badge tone="purple">PRIVATE · ONLY YOU SEE THIS</Badge>
                  <dl className="text-sm mt-3 grid gap-2">
                    {(
                      [
                        ["Private notes", ownerDetail.privateDetails.privateNotes],
                        ["Serial fragment", ownerDetail.privateDetails.serialFragment],
                        ["Unique markings", ownerDetail.privateDetails.uniqueMarkings],
                        ["Contents", ownerDetail.privateDetails.privateContents],
                      ] as const
                    )
                      .filter(([, value]) => Boolean(value))
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt className="eyebrow text-muted-foreground">{label}</dt>
                          <dd className="mt-1">{value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              )}
              {ownerDetail.verificationQuestions.length > 0 && (
                <div className="border-2 border-foreground p-4">
                  <Badge tone="purple">YOUR VERIFICATION QUESTIONS</Badge>
                  <ol className="text-sm mt-3 grid gap-2 pl-5">
                    {ownerDetail.verificationQuestions.map((question) => (
                      <li key={question.id}>{question.question}</li>
                    ))}
                  </ol>
                </div>
              )}
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/activity">Manage this listing</Link>
              </Button>
            </div>
          ) : listing.status !== "ACTIVE" ? (
            <p className="text-sm font-bold">
              This listing is {STATUS_LABELS[listing.status].toLowerCase()} and is no longer
              accepting claims.
            </p>
          ) : isLost ? (
            <Button asChild size="lg" variant="lime" className="w-full">
              <Link to="/post/found">
                I found something like this <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="pink" className="w-full">
              <Link to="/claim/$id" params={{ id: listing.id }}>
                This might be mine <ArrowRight />
              </Link>
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            No contact details shared. Keep the conversation on Kept.
          </p>
        </div>
      </div>
    </Page>
  );
}

export function MatchesPage() {
  const [tab, setTab] = useState("All matches");
  return (
    <Page
      eyebrow="A LITTLE FAMILIAR? / MATCHES"
      title="Your things might be closer."
      description="Possible matches for your reports. Similarity is a clue, not proof of ownership."
    >
      <Tabs
        options={["All matches", "Very strong", "Strong", "Possible"]}
        value={tab}
        onChange={setTab}
      />
      <div className="grid gap-5">
        {[items[0], items[5], items[2]].map((item, i) => {
          const ranks = ["Very strong", "Strong", "Possible"];
          if (tab !== "All matches" && tab !== ranks[i]) return null;
          return (
            <div
              key={item.id}
              className="panel p-5 grid md:grid-cols-[160px_1fr_180px] gap-6 items-center"
            >
              <div className="h-40 bg-mint/30">
                <img
                  src={item.image}
                  alt={item.title}
                  className="item-photo"
                  width={512}
                  height={512}
                />
              </div>
              <div>
                <Badge tone={i === 0 ? "lime" : i === 1 ? "mint" : "orange"}>
                  {ranks[i]} match
                </Badge>
                <h2 className="text-2xl font-bold mt-3">{item.title}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Found near {item.location} · {dateLabel(item.date)}
                </p>
                <div className="flex flex-wrap gap-3 mt-4 eyebrow">
                  <span>✓ Category</span>
                  <span>✓ Nearby location</span>
                  <span>✓ Date overlaps</span>
                  <span>≈ Description</span>
                </div>
              </div>
              <div>
                <p className="text-5xl font-extrabold">
                  {[94, 82, 68][i]}
                  <span className="text-xl">%</span>
                </p>
                <p className="eyebrow mt-1 mb-5">SIMILARITY, NOT OWNERSHIP</p>
                <Button asChild variant="lime">
                  <Link to="/listing/$id" params={{ id: item.id }}>
                    See item <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6">
        <TrustNote>
          A person checks your private answers before a claim can be accepted. No automatic
          ownership decisions.
        </TrustNote>
      </div>
    </Page>
  );
}
