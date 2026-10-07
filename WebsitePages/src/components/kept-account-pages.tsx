import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Star,
  Heart,
  CheckCircle2,
  Sparkles,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Bell,
  Mail,
  HandHeart,
  Flag,
} from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Page, Badge, Tabs, TrustNote } from "./kept-shared";
import { MyListings } from "./kept-my-listings";
import { useKept } from "@/lib/kept-context";
import { useAuth } from "@/lib/auth-context";
import {
  useCurrentProfile,
  usePasswordReset,
  useSignIn,
  useSignOut,
  useSignUp,
  useUpdateProfile,
} from "@/hooks/use-auth-mutations";
import type { MyProfile, UpdateProfileInput } from "@/lib/services/profile-types";
import { useMyItems } from "@/hooks/use-listings";
import { items, getItem } from "@/lib/kept-data";

/**
 * Client-side validation mirrors the database constraints in
 * supabase/migrations/20261007092206_profiles_and_auth.sql, so a person sees the
 * problem before a round trip (docs/securityAndService.md §81 — the database remains
 * the authority; this is a usability layer, not the enforcement).
 */
const emailSchema = z.string().trim().min(1, "Enter your college email.").email({
  message: "That does not look like a valid email address.",
});
const passwordSchema = z.string().min(8, "Use at least 8 characters for your password.");
const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Tell us what to call you.")
  .max(80, "Display names are up to 80 characters.");

const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
const signUpSchema = signInSchema.extend({ displayName: displayNameSchema });

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "Usernames use 3–30 lowercase letters, numbers or underscores.");

/**
 * Binds the profile screen to real data. Reputation values are read-only by
 * construction: `UpdateProfileInput` has no field for them.
 */
function useProfileScreen() {
  const { data, isPending, isError } = useCurrentProfile();
  const updateMutation = useUpdateProfile();

  return {
    profile: data ?? null,
    isLoading: isPending,
    isError,
    save: (input: UpdateProfileInput) => updateMutation.mutateAsync(input),
    isSaving: updateMutation.isPending,
    saveError: updateMutation.error?.message ?? null,
  };
}

/** Inline editor for the safe profile fields the approved screen exposes. */
function ProfileEditor({
  profile,
  onSave,
  isSaving,
  saveError,
}: {
  profile: MyProfile;
  onSave: (input: UpdateProfileInput) => Promise<MyProfile>;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="mt-7 w-full"
        onClick={() => {
          setDisplayName(profile.displayName);
          setUsername(profile.username ?? "");
          setError("");
          setSaved(false);
          setIsOpen(true);
        }}
      >
        Edit profile
      </Button>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setError("");
    setSaved(false);

    const parsedName = displayNameSchema.safeParse(displayName);
    if (!parsedName.success) {
      setError(parsedName.error.issues[0]?.message ?? "Check your display name.");
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length > 0) {
      const parsedUsername = usernameSchema.safeParse(trimmedUsername);
      if (!parsedUsername.success) {
        setError(parsedUsername.error.issues[0]?.message ?? "Check your username.");
        return;
      }
    }

    try {
      await onSave({
        displayName: parsedName.data,
        // null clears the username; a string sets it.
        username: trimmedUsername.length > 0 ? trimmedUsername.toLowerCase() : null,
      });
      setSaved(true);
      setIsOpen(false);
    } catch {
      // The message is surfaced through `saveError`.
    }
  };

  return (
    <form className="mt-7 border-t-2 border-foreground pt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="field-label">
        Display name
        <input
          className="field"
          value={displayName}
          maxLength={80}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <label className="field-label">
        Username (optional)
        <input
          className="field"
          value={username}
          maxLength={30}
          placeholder="yourname"
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      {/* Avatar upload is deliberately out of scope for this phase; the `avatars`
          bucket and its policies exist, but the upload UI arrives with the storage
          phase. */}
      <p className="text-xs text-muted-foreground">
        Photo uploads are coming with the next release.
      </p>
      {(error || saveError) && (
        <p role="alert" className="text-destructive text-sm">
          {error || saveError}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          Saved.
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="lime" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ActivityPage() {
  // Listings are real. Claims, matches, recoveries and returns remain mock until
  // their own phases — they are labelled as a preview in the UI below so a visitor
  // cannot read them as backend truth.
  const { claims, handedOver, received } = useKept();
  const [tab, setTab] = useState("My Lost Reports");
  const { data: lostReports } = useMyItems("LOST");
  const { data: foundListings } = useMyItems("FOUND");
  const options = [
    "My Lost Reports",
    "My Found Listings",
    "Possible Matches",
    "Claims Sent",
    "Claims Received",
    "Active Recoveries",
    "Completed Returns",
  ];
  return (
    <Page
      eyebrow="YOUR LITTLE CORNER / ACTIVITY"
      title="Everything, in one place."
      action={
        <Button asChild variant="pink">
          <Link to="/post">
            Post an item <ArrowUpRight />
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          [String(lostReports?.length ?? "\u2014"), "LOST REPORTS", "bg-pink"],
          [String(foundListings?.length ?? "\u2014"), "FOUND LISTINGS", "bg-mint"],
          [
            String(claims.filter((c) => c.status === "Pending").length),
            "PENDING CLAIMS",
            "bg-orange",
          ],
          [handedOver && received ? "04" : "03", "HAPPY RETURNS", "bg-lime"],
        ].map(([n, label, tone]) => (
          <div key={label} className={`border-2 border-foreground p-5 ${tone}`}>
            <p className="text-4xl font-bold">{n}</p>
            <p className="eyebrow mt-2">{label}</p>
          </div>
        ))}
      </div>
      <Tabs options={options} value={tab} onChange={setTab} />
      {tab === "My Lost Reports" || tab === "My Found Listings" ? (
        <MyListings listingType={tab === "My Lost Reports" ? "LOST" : "FOUND"} />
      ) : tab === "Possible Matches" ? (
        <div className="grid gap-5">
          <PreviewNotice feature="Matching" />
          {[items[0], items[5]].map((i, n) => (
            <Link
              key={i.id}
              to="/listing/$id"
              params={{ id: i.id }}
              className="panel p-5 flex items-center gap-5"
            >
              <img src={i.image} alt={i.title} className="w-20 h-20 object-cover" />
              <div className="flex-1">
                <Badge>{n ? "Strong" : "Very Strong"} match</Badge>
                <h2 className="text-xl font-bold mt-2">{i.title}</h2>
              </div>
              <ArrowRight />
            </Link>
          ))}
        </div>
      ) : tab === "Claims Sent" || tab === "Claims Received" ? (
        <div className="grid gap-4">
          <PreviewNotice feature="Claims" />
          {claims
            .filter((c) => c.direction === (tab === "Claims Sent" ? "Sent" : "Received"))
            .map((c) => (
              <Link
                key={c.id}
                to="/claims"
                className="panel p-5 flex justify-between items-center gap-4"
              >
                <div>
                  <h2 className="font-bold">{getItem(c.itemId)?.title}</h2>
                  <p className="text-sm mt-1">{c.person}</p>
                </div>
                <Badge tone={c.status === "Accepted" ? "lime" : "orange"}>{c.status}</Badge>
                <ArrowRight />
              </Link>
            ))}
        </div>
      ) : (
        <div className="grid gap-4">
          <PreviewNotice feature={tab === "Completed Returns" ? "Returns" : "Recovery"} />
          <div className="panel p-6 flex flex-wrap gap-5 items-center">
            <img src={items[0].image} alt={items[0].title} className="w-24 h-24 object-cover" />
            <div className="flex-1">
              <Badge tone="mint">
                {tab === "Completed Returns" ? "Returned" : "Ownership verified"}
              </Badge>
              <h2 className="text-xl font-bold mt-3">
                {tab === "Completed Returns" ? "Student ID card" : "Grey oversized hoodie"}
              </h2>
              <p className="text-xs mt-2">One more thing, back with its person.</p>
            </div>
            {tab === "Completed Returns" ? (
              <Button asChild variant="lime">
                <Link to="/returned/$id" params={{ id: "id-card" }}>
                  Return & review <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="lime">
                <Link to="/recovery/$id" params={{ id: "hoodie" }}>
                  Continue recovery <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

/**
 * Marks a surface that still renders sample data, so a visitor is never shown a
 * mock record as though the backend produced it. Each of these disappears when its
 * phase lands.
 */
function PreviewNotice({ feature }: { feature: string }) {
  return (
    <div className="flex gap-3 bg-orange/20 border-2 border-foreground p-4 text-sm">
      <Sparkles className="shrink-0" size={20} aria-hidden="true" />
      <div>
        <b>{feature} is not switched on yet.</b> The examples below are sample data, not your real
        activity. Your reports and listings above are real.
      </div>
    </div>
  );
}
const notifications = [
  {
    id: 1,
    type: "Matches",
    title: "A very strong match for your grey hoodie.",
    text: "94% similarity. Take a look — a match isn’t proof of ownership.",
    when: "5 minutes ago",
    icon: Sparkles,
    to: "/matches",
  },
  {
    id: 2,
    type: "Claims",
    title: "Rohan sent a claim for your steel bottle.",
    text: "Three private answers are ready for your review.",
    when: "25 minutes ago",
    icon: ShieldCheck,
    to: "/claims",
  },
  {
    id: 3,
    type: "Claims",
    title: "Your hoodie claim was accepted.",
    text: "The finder verified your ownership. Time to say hello.",
    when: "1 hour ago",
    icon: CheckCircle2,
    to: "/claims",
  },
  {
    id: 4,
    type: "Messages",
    title: "Ananya sent you a message.",
    text: "“Could we meet at the library help desk tomorrow?”",
    when: "1 hour ago",
    icon: MessageSquare,
    to: "/messages",
  },
  {
    id: 5,
    type: "Claims",
    title: "Your AirPods claim wasn’t accepted.",
    text: "The private details didn’t match. Keep checking the board.",
    when: "Yesterday",
    icon: Flag,
    to: "/claims",
  },
  {
    id: 6,
    type: "Messages",
    title: "Your handover is coming up.",
    text: "Confirm the time and public meeting place in your chat.",
    when: "Yesterday",
    icon: MapPin,
    to: "/messages",
  },
  {
    id: 7,
    type: "Claims",
    title: "Student ID, successfully returned.",
    text: "Both people confirmed the return. That’s a happy ending.",
    when: "2 days ago",
    icon: Heart,
    to: "/activity",
  },
  {
    id: 8,
    type: "Claims",
    title: "A little credit goes a long way.",
    text: "Leave a rating for your completed return.",
    when: "2 days ago",
    icon: Star,
    to: "/activity",
  },
];
export function NotificationsPage() {
  const [tab, setTab] = useState("All");
  const [read, setRead] = useState<number[]>([]);
  return (
    <Page
      eyebrow="GOOD NEWS & NEXT STEPS / NOTIFICATIONS"
      title="You’re in the loop."
      action={
        <Button variant="outline" onClick={() => setRead(notifications.map((n) => n.id))}>
          <CheckCircle2 />
          Mark all as read
        </Button>
      }
    >
      <Tabs options={["All", "Matches", "Claims", "Messages"]} value={tab} onChange={setTab} />
      <div className="panel">
        {notifications
          .filter((n) => tab === "All" || n.type === tab)
          .map((n) => (
            <Link
              key={n.id}
              to={n.to as "/matches" | "/claims" | "/messages" | "/activity"}
              onClick={() => setRead((p) => [...p, n.id])}
              className={`flex gap-5 items-center p-6 border-b border-foreground/20 last:border-0 ${read.includes(n.id) ? "bg-paper" : "bg-lime/15"}`}
            >
              <span className="w-11 h-11 border-2 border-foreground bg-pink/50 grid place-content-center shrink-0">
                <n.icon size={21} />
              </span>
              <div className="flex-1">
                <h2 className="font-bold">{n.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{n.text}</p>
                <p className="eyebrow text-[10px] mt-2">{n.when}</p>
              </div>
              {!read.includes(n.id) && <span className="w-2 h-2 bg-purple rounded-full shrink-0" />}
              <ArrowUpRight size={17} />
            </Link>
          ))}
      </div>
    </Page>
  );
}
/** Two-letter monogram for the avatar tile, matching the approved presentation. */
function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function ProfilePage() {
  const { profile, isLoading, isError, save, isSaving, saveError } = useProfileScreen();

  if (isLoading) {
    return (
      <Page eyebrow="KINDNESS BUILDS CREDIBILITY / TRUST PROFILE" title="Good humans leave a mark.">
        <div className="grid md:grid-cols-[340px_1fr] gap-8">
          <Skeleton className="h-[26rem] border-2 border-foreground" />
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-28 border-2 border-foreground" />
              ))}
            </div>
            <Skeleton className="h-8 w-80 mt-9" />
            <Skeleton className="h-32 mt-5" />
          </div>
        </div>
      </Page>
    );
  }

  if (isError || !profile) {
    return (
      <Page eyebrow="KINDNESS BUILDS CREDIBILITY / TRUST PROFILE" title="Good humans leave a mark.">
        <div className="panel p-8 max-w-xl">
          <h2 className="text-xl font-bold">We could not load your profile.</h2>
          <p className="text-sm mt-3 text-muted-foreground">
            This is usually temporary. Try reloading the page in a moment.
          </p>
        </div>
      </Page>
    );
  }

  const memberSince = new Date(profile.createdAt).getFullYear();
  const isNewMember = profile.ratingCount === 0 && profile.successfulReturns === 0;

  return (
    <Page eyebrow="KINDNESS BUILDS CREDIBILITY / TRUST PROFILE" title="Good humans leave a mark.">
      <div className="grid md:grid-cols-[340px_1fr] gap-8">
        <aside className="bg-pink/40 border-2 border-foreground p-8 self-start">
          <div className="w-24 h-24 bg-orange border-2 border-foreground shadow-brutal rounded-full grid place-content-center text-3xl font-bold mb-7">
            {initialsOf(profile.displayName)}
          </div>
          <h2 className="text-3xl font-bold break-words">{profile.displayName}</h2>
          <p className="text-sm mt-2">
            {profile.username ? `@${profile.username} · ` : ""}Campus community
          </p>
          <div className="mt-5">
            <Badge tone="lime">
              <ShieldCheck size={13} />
              COLLEGE VERIFIED
            </Badge>
          </div>
          <div className="border-t-2 border-foreground mt-7 pt-6">
            <p className="eyebrow">CAMPUS MEMBER SINCE {memberSince}</p>
            <p className="text-sm mt-4">
              {isNewMember
                ? "You’re just getting started. Your first return will show up here."
                : "Keeping things safe. Helping them find their people."}
            </p>
          </div>
          <ProfileEditor
            profile={profile}
            onSave={save}
            isSaving={isSaving}
            saveError={saveError}
          />
          <p className="text-xs mt-8 flex items-center gap-2">
            <LockKeyhole size={14} />
            No contact information is public.
          </p>
        </aside>
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              [profile.trustScore.toFixed(0), "TRUST SCORE", "bg-lime"],
              [
                profile.averageRating === null ? "—" : profile.averageRating.toFixed(1),
                "AVG. RATING",
                "bg-orange",
              ],
              [String(profile.successfulReturns), "ITEMS RETURNED", "bg-mint"],
              [String(profile.ratingCount), "RATINGS", "bg-paper"],
            ].map(([n, label, tone]) => (
              <div key={label} className={`border-2 border-foreground p-5 ${tone}`}>
                <p className="text-4xl font-bold">{n}</p>
                <p className="eyebrow mt-2">{label}</p>
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold mt-9 mb-5">A little well-earned recognition.</h2>
          {isNewMember ? (
            <p className="text-sm text-muted-foreground max-w-prose">
              Badges arrive as you help things find their people. Post a found item or report
              something you’ve lost to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {[
                [HandHeart, "RETURN CHAMPION"],
                [ShieldCheck, "TRUSTED FINDER"],
                [Heart, "CAMPUS KINDNESS"],
              ].map(([I, label]) => {
                const Icon = I as typeof Heart;
                return (
                  <span
                    key={String(label)}
                    className="bg-lime border-2 border-foreground p-3 flex items-center gap-2 eyebrow"
                  >
                    <Icon size={18} />
                    {String(label)}
                  </span>
                );
              })}
            </div>
          )}
          <h2 className="text-2xl font-bold mt-9 mb-5">People remember the good stuff.</h2>
          {/* Reviews come from the ratings table, which belongs to the trust/rating
              phase. Until then this is an honest empty state rather than mock praise. */}
          <p className="text-sm text-muted-foreground max-w-prose">
            {profile.ratingCount === 0
              ? "No reviews yet. After a completed return, the other person can leave one here."
              : `${profile.ratingCount} ${profile.ratingCount === 1 ? "person has" : "people have"} rated you. Individual reviews arrive with the ratings release.`}
          </p>
        </div>
      </div>
    </Page>
  );
}
export function SafetyPage() {
  return (
    <Page
      eyebrow="A KIND CAMPUS IS A SAFE CAMPUS / SAFETY"
      title="Look out for things. And people."
      description="A little care makes every reunion better."
    >
      <div className="grid md:grid-cols-2 gap-7">
        <div className="bg-mint border-2 border-foreground p-8">
          <LockKeyhole size={39} />
          <h2 className="text-3xl font-bold mt-6">Private by design.</h2>
          <div className="mt-6 space-y-6">
            {[
              [
                "Approximate, not exact.",
                "Public listings show a campus area, never an exact room, home address or live location.",
              ],
              [
                "The details only an owner knows.",
                "Identifying marks and claim answers stay private. Hide names and ID numbers in photos.",
              ],
              [
                "Keep it on Kept.",
                "No public phone numbers or email addresses. Talk through in-app messages.",
              ],
              [
                "A match isn’t ownership.",
                "Similarity helps you look in the right direction. A human finder checks the private answers.",
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm mt-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-orange/40 border-2 border-foreground p-8">
          <MapPin size={39} />
          <h2 className="text-3xl font-bold mt-6">Meet with a little care.</h2>
          <div className="mt-6 space-y-6">
            {[
              [
                "Public place. Daylight.",
                "Meet at the library help desk, campus security office or a busy café. Never meet at a private address.",
              ],
              [
                "Bring a friend.",
                "If you feel unsure, don’t go alone. Campus security can also help with a handover.",
              ],
              [
                "No fees. No secrets.",
                "Never pay to get your own item back. Don’t share passwords, financial details or verification codes.",
              ],
              [
                "Check. Confirm. Celebrate.",
                "Make sure it’s the right item, then both confirm the return. Rate only a completed handover.",
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm mt-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-7">
        <TrustNote>
          If something feels wrong, pause the handover and contact your college’s campus security or
          student support.
        </TrustNote>
      </div>
    </Page>
  );
}
export function AuthPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const signOutMutation = useSignOut();
  const signInMutation = useSignIn();
  const signUpMutation = useSignUp();
  const resetMutation = usePasswordReset();
  const navigate = useNavigate();
  const { redirect: redirectTo } = useSearch({ from: "/auth" });

  const [tab, setTab] = useState("Sign in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSubmitting = signInMutation.isPending || signUpMutation.isPending;

  if (isAuthLoading) {
    return (
      <Page eyebrow="CAMPUS COMMUNITY" title="One moment.">
        <Skeleton className="h-40 max-w-2xl border-2 border-foreground" />
      </Page>
    );
  }

  if (isAuthenticated)
    return (
      <Page eyebrow="CAMPUS COMMUNITY" title="You’re part of the good stuff.">
        <div className="bg-lime p-8 border-2 border-foreground max-w-2xl">
          <ShieldCheck size={40} />
          <p className="mt-4 font-bold">You’re signed in to your campus community.</p>
          <div className="flex gap-4 mt-6">
            <Button asChild>
              <Link to="/activity">
                My activity <ArrowRight />
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              {signOutMutation.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </Page>
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setNotice("");

    const parsed = (tab === "Sign in" ? signInSchema : signUpSchema).safeParse({
      email,
      password,
      displayName: name,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the details above and try again.");
      return;
    }

    if (tab === "Sign in") {
      const result = await signInMutation.mutateAsync({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await navigate({ to: redirectTo ?? "/activity" });
      return;
    }

    const result = await signUpMutation.mutateAsync({ email, password, displayName: name.trim() });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.session) {
      await navigate({ to: redirectTo ?? "/activity" });
      return;
    }
    // Email confirmation is on: there is no session yet, so say so rather than
    // bouncing the person into a protected screen they would be redirected out of.
    setNotice("Check your inbox to confirm your email, then come back and sign in.");
    setTab("Sign in");
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");
    if (!z.string().email().safeParse(email).success) {
      setError("Enter your college email above first, then request a reset link.");
      return;
    }
    const result = await resetMutation.mutateAsync(email);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("If that address has an account, a reset link is on its way.");
  };

  return (
    <Page eyebrow="YOUR CAMPUS. YOUR COMMUNITY. / SIGN IN" title="Good people, verified.">
      <div className="grid md:grid-cols-[1fr_1fr] gap-10">
        <div className="grid-paper border-2 border-foreground bg-pink/30 p-10">
          <span className="text-7xl font-extrabold">kept✳</span>
          <h2 className="section-title mt-7">
            Lost it.
            <br />
            Find it.
            <br />
            Get it back.
          </h2>
          <p className="text-base mt-6 max-w-sm">
            A trusted little community for the things that matter. One college, a lot of good
            humans.
          </p>
          <div className="mt-8">
            <Badge tone="lime">
              <ShieldCheck size={13} />
              COLLEGE-VERIFIED COMMUNITY
            </Badge>
          </div>
        </div>
        <form className="panel p-8" onSubmit={handleSubmit}>
          <Tabs
            options={["Sign in", "Sign up"]}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setError("");
              setNotice("");
            }}
          />
          <h2 className="text-2xl font-bold mb-6">
            {tab === "Sign in" ? "Welcome back." : "Find your community."}
          </h2>
          <div className="space-y-5">
            {tab === "Sign up" && (
              <label className="field-label">
                Display name
                <input
                  required
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}
            <label className="field-label">
              College email
              <input
                required
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
              />
            </label>
            <label className="field-label">
              Password
              <input
                required
                type="password"
                autoComplete={tab === "Sign in" ? "current-password" : "new-password"}
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm mt-4">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm mt-4">
              {notice}
            </p>
          )}
          <Button type="submit" variant="pink" className="w-full mt-7" disabled={isSubmitting}>
            {isSubmitting
              ? tab === "Sign in"
                ? "Signing in…"
                : "Creating your account…"
              : tab === "Sign in"
                ? "Sign in"
                : "Join Kept"}
            <ArrowRight />
          </Button>
          {tab === "Sign in" && (
            <button
              type="button"
              className="subtle-link inline-block mt-5 text-left"
              disabled={resetMutation.isPending}
              onClick={() => void handleForgotPassword()}
            >
              {resetMutation.isPending ? "Sending reset link…" : "Forgot your password?"}
            </button>
          )}
          <Link to="/safety" className="subtle-link inline-block mt-5">
            Safety & privacy
          </Link>
        </form>
      </div>
    </Page>
  );
}
