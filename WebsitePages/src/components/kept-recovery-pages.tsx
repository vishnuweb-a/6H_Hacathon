import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  LockKeyhole,
  Send,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Star,
  PartyPopper,
  CalendarDays,
} from "lucide-react";
import { Button } from "./ui/button";
import { Page, Badge, Tabs, TrustNote } from "./kept-shared";
import { getItem } from "@/lib/kept-data";
import { getDemoItem } from "@/lib/demo-fixtures";
import { useKept, type ClaimStatus } from "@/lib/kept-context";

/**
 * Claim submission is a later phase. The screen still renders its approved design
 * from isolated demo fixtures, so it is never wired to a real listing id — a real
 * item reaching this screen would look like a working claim flow when none exists.
 */
export function ClaimPage({ id }: { id: string }) {
  const { addClaim } = useKept();
  const item = getDemoItem(id);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [sent, setSent] = useState(false);
  const questions = [
    "What unique mark, label or detail would we find on it?",
    "Can you describe a detail that isn’t visible in the public photo?",
    "Where and when did you last have it?",
  ];
  if (!item)
    return (
      <Page
        eyebrow="CLAIM"
        title="Claims are not switched on yet."
        description="Posting and browsing work today. Submitting an ownership claim arrives in the next release, together with the verification flow that protects both sides."
      >
        <Button asChild variant="lime">
          <Link to="/explore">Back to the board</Link>
        </Button>
      </Page>
    );
  if (sent)
    return (
      <Page eyebrow="CLAIM SENT / WAITING ON A HUMAN" title="Your claim is in good hands.">
        <div className="bg-lime border-2 border-foreground p-8 max-w-2xl">
          <ShieldCheck size={45} />
          <h2 className="text-2xl font-bold mt-4">Now, a real person takes a look.</h2>
          <p className="mt-3">
            The finder will compare your answers with the private details. Your claim is pending,
            not proof of ownership.
          </p>
          <Button asChild className="mt-6">
            <Link to="/claims">
              Track your claim <ArrowRight />
            </Link>
          </Button>
        </div>
      </Page>
    );
  return (
    <Page eyebrow="THIS MIGHT BE MINE / OWNERSHIP CHECK" title="A few details only you know.">
      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <aside className="panel p-5 self-start">
          <img src={item.image} alt={item.title} className="w-full h-56 object-cover bg-mint/20" />
          <h2 className="text-xl font-bold mt-5">{item.title}</h2>
          <p className="text-xs mt-2">Found near {item.location}</p>
          <div className="mt-5">
            <Badge tone="orange">NOT VERIFIED YET</Badge>
          </div>
        </aside>
        <div className="panel p-8">
          <div className="flex gap-2 mb-7">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 ${i <= step ? "bg-purple" : "bg-foreground/10"}`}
              />
            ))}
          </div>
          <p className="eyebrow mb-4">QUESTION {step + 1} OF 3</p>
          <h2 className="text-2xl font-bold mb-6">{questions[step]}</h2>
          <label className="field-label">
            Your private answer
            <textarea
              aria-label="Your private answer"
              className="field min-h-36"
              value={answers[step]}
              onChange={(e) =>
                setAnswers((a) => a.map((v, i) => (i === step ? e.target.value : v)))
              }
              placeholder="Be specific. These answers go only to the finder."
            />
          </label>
          <div className="mt-6">
            <TrustNote>
              Humans verify ownership. Your answers are private and never shown publicly. A
              similarity score can’t accept a claim.
            </TrustNote>
          </div>
          <div className="flex justify-between mt-7">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft />
              Back
            </Button>
            <Button
              variant="pink"
              disabled={!answers[step]?.trim()}
              onClick={() => {
                if (step < 2) setStep((s) => s + 1);
                else {
                  addClaim(id, answers);
                  setSent(true);
                }
              }}
            >
              {step === 2 ? "Send claim" : "Next question"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
}
export function ClaimsPage() {
  const { claims, updateClaim } = useKept();
  const [tab, setTab] = useState("Claims Sent");
  const [status, setStatus] = useState("All statuses");
  const [expanded, setExpanded] = useState("");
  const selected = claims.filter(
    (c) =>
      c.direction === (tab === "Claims Sent" ? "Sent" : "Received") &&
      (status === "All statuses" || c.status === status),
  );
  return (
    <Page eyebrow="REAL PEOPLE, REAL VERIFICATION / CLAIMS" title="One step closer to home.">
      <div className="flex flex-wrap justify-between">
        <Tabs options={["Claims Sent", "Claims Received"]} value={tab} onChange={setTab} />
        <select
          className="field w-auto mb-6"
          aria-label="Claim status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["All statuses", "Pending", "Accepted", "Rejected", "Cancelled", "Completed"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      <div className="grid gap-5">
        {selected.map((c) => {
          const item = getItem(c.itemId);
          if (!item) return null;
          return (
            <div className="panel p-5" key={c.id}>
              <div className="flex flex-wrap items-center gap-5">
                <img src={item.image} alt={item.title} className="w-24 h-24 object-cover" />
                <div className="flex-1 min-w-40">
                  <Badge
                    tone={
                      c.status === "Accepted" || c.status === "Completed"
                        ? "lime"
                        : c.status === "Rejected"
                          ? "pink"
                          : "orange"
                    }
                  >
                    {c.status}
                  </Badge>
                  <h2 className="text-xl font-bold mt-2">{item.title}</h2>
                  <p className="text-xs mt-1">
                    {c.direction === "Sent" ? "Finder" : "Claimant"}: {c.person} · {item.location}
                  </p>
                </div>
                {c.status === "Pending" && c.direction === "Sent" && (
                  <Button variant="outline" onClick={() => updateClaim(c.id, "Cancelled")}>
                    Cancel claim
                  </Button>
                )}
                {c.status === "Pending" && c.direction === "Received" && (
                  <Button variant="lime" onClick={() => setExpanded(expanded === c.id ? "" : c.id)}>
                    Review answers <ArrowRight />
                  </Button>
                )}
                {c.status === "Accepted" && (
                  <Button asChild variant="lime">
                    <Link to="/recovery/$id" params={{ id: c.itemId }}>
                      Plan return <ArrowRight />
                    </Link>
                  </Button>
                )}
                {c.status === "Completed" && (
                  <Button asChild variant="outline">
                    <Link to="/returned/$id" params={{ id: c.itemId }}>
                      Return details
                    </Link>
                  </Button>
                )}
              </div>
              {expanded === c.id && (
                <div className="border-t-2 border-foreground mt-5 pt-5">
                  <p className="eyebrow flex gap-2 items-center mb-3">
                    <LockKeyhole size={14} />
                    PRIVATE OWNERSHIP ANSWERS
                  </p>
                  {c.answers.map((a, i) => (
                    <p key={i} className="text-sm mb-2">
                      <b>{i + 1}.</b> {a}
                    </p>
                  ))}
                  <p className="text-sm text-muted-foreground my-4">
                    Compare with what you found. Accept only if you’re confident the item belongs to
                    them.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="lime"
                      onClick={() => {
                        updateClaim(c.id, "Accepted");
                        setExpanded("");
                      }}
                    >
                      <Check />
                      Accept claim
                    </Button>
                    <Button
                      variant="pink"
                      onClick={() => {
                        updateClaim(c.id, "Rejected");
                        setExpanded("");
                      }}
                    >
                      Reject claim
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!selected.length && (
          <div className="panel p-10 text-center">
            No {status === "All statuses" ? "" : status.toLowerCase()} claims here.
          </div>
        )}
      </div>
    </Page>
  );
}
export function MessagesPage() {
  const { messages, sendMessage } = useKept();
  const [text, setText] = useState("");
  const [active, setActive] = useState("Ananya Sharma");
  const [otherMessages, setOtherMessages] = useState<{ text: string; mine: boolean }[]>([
    { text: "Thanks for checking! Let me know if you find the calculator.", mine: false },
  ]);
  const [plan, setPlan] = useState(false);
  const [place, setPlace] = useState("Central Library help desk");
  const [time, setTime] = useState("2026-10-08T14:00");
  const [planned, setPlanned] = useState(false);
  const chat = active === "Ananya Sharma" ? messages : otherMessages;
  const item = getItem(active === "Ananya Sharma" ? "hoodie" : "calculator");
  const send = () => {
    if (!text.trim()) return;
    if (active === "Ananya Sharma") sendMessage(text.trim());
    else setOtherMessages((p) => [...p, { text: text.trim(), mine: true }]);
    setText("");
  };
  return (
    <Page eyebrow="KEEP IT ON KEPT / MESSAGES" title="Good news travels here.">
      <div className="panel grid md:grid-cols-[290px_1fr] min-h-[570px]">
        <aside className="md:border-r-2 border-b-2 md:border-b-0 border-foreground">
          <div className="p-5 border-b-2 border-foreground font-bold">
            Your conversations <span className="float-right eyebrow">02</span>
          </div>
          {["Ananya Sharma", "Rohan Mehta"].map((name, i) => (
            <Button
              key={name}
              variant="ghost"
              className={`w-full h-auto rounded-none p-5 justify-start text-left whitespace-normal border-b border-foreground/20 ${active === name ? "bg-lime/40" : ""}`}
              onClick={() => {
                setActive(name);
                setPlanned(false);
                setPlan(false);
              }}
            >
              <span className="bg-orange border border-foreground rounded-full w-10 h-10 grid place-content-center shrink-0">
                {i ? "RM" : "AS"}
              </span>
              <span>
                <b className="block">{name}</b>
                <span className="text-xs font-normal block mt-1">
                  {i ? "Blue Casio calculator" : "Grey oversized hoodie"}
                </span>
              </span>
            </Button>
          ))}
        </aside>
        <div className="flex flex-col">
          <div className="p-5 border-b-2 border-foreground flex flex-wrap gap-4 items-center">
            {item && <img src={item.image} alt={item.title} className="w-12 h-12 object-cover" />}
            <div className="flex-1">
              <h2 className="font-bold">{active}</h2>
              <p className="text-xs mt-1">
                {item?.title} ·{" "}
                {active === "Ananya Sharma" ? "Ownership verified" : "Report discussion"}
              </p>
            </div>
            {active === "Ananya Sharma" && (
              <Button variant="lime" onClick={() => setPlan(!plan)}>
                <CalendarDays />
                Plan handover
              </Button>
            )}
          </div>
          <div className="px-5 py-3 bg-mint/30 text-xs flex items-center gap-2">
            <ShieldCheck size={15} />
            No public phone numbers. No emails. Just a safer conversation.
          </div>
          <div className="p-6 flex-1 space-y-5">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.mine ? "justify-end" : ""}`}>
                <div
                  className={`border-2 border-foreground max-w-[80%] p-4 text-sm ${m.mine ? "bg-lime" : "bg-background"}`}
                >
                  {m.text}
                  <p className="eyebrow text-[9px] mt-2 text-muted-foreground">
                    {m.mine ? "YOU" : "FINDER"} · {10 + i}:12
                  </p>
                </div>
              </div>
            ))}
            {planned && (
              <div className="bg-mint border-2 border-foreground p-4 text-sm">
                <b>Handover proposed</b>
                <p className="mt-1">
                  {place} · {time.replace("T", " at ")}
                </p>
                <Link
                  to="/recovery/$id"
                  params={{ id: "hoodie" }}
                  className="subtle-link inline-block mt-3"
                >
                  View recovery timeline →
                </Link>
              </div>
            )}
            {plan && (
              <form
                className="panel p-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPlanned(true);
                  setPlan(false);
                  sendMessage(`Handover proposed: ${place}, ${time.replace("T", " at ")}.`);
                }}
              >
                <h3 className="font-bold">Meet somewhere public.</h3>
                <label className="field-label">
                  Meeting place
                  <input
                    required
                    className="field"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Date & time
                  <input
                    required
                    type="datetime-local"
                    className="field"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <Button variant="lime" type="submit">
                  Propose handover <ArrowRight />
                </Button>
              </form>
            )}
          </div>
          <form
            className="border-t-2 border-foreground p-4 flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="field"
              aria-label="Message"
              placeholder="Write a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              type="submit"
              variant="pink"
              size="icon"
              className="h-12 w-12 shrink-0"
              aria-label="Send message"
              disabled={!text.trim()}
            >
              <Send />
            </Button>
          </form>
        </div>
      </div>
    </Page>
  );
}
export function RecoveryPage({ id }: { id: string }) {
  const { handedOver, received, confirm, claims, updateClaim } = useKept();
  const [checks, setChecks] = useState([false, false, false]);
  const item = getItem(id);
  const claim = claims.find((c) => c.itemId === id && c.status === "Accepted");
  const verified = Boolean(claim) || id === "hoodie";
  if (!item)
    return (
      <Page eyebrow="RECOVERY" title="Recovery not found.">
        <Button asChild>
          <Link to="/claims">View claims</Link>
        </Button>
      </Page>
    );
  return (
    <Page
      eyebrow="THE ROAD BACK / RECOVERY"
      title={received && handedOver ? "Back where it belongs." : "Let’s get it home."}
      description={item.title}
    >
      <div className="border-2 border-foreground bg-paper p-6 grid grid-cols-3 md:grid-cols-6 gap-6 mb-8">
        {["Match", "Claim", "Verified", "Chat", "Handover", "Confirmation"].map((s, i) => (
          <div key={s} className="text-center">
            <span
              className={`w-9 h-9 border-2 border-foreground mx-auto grid place-content-center ${i < 2 || (verified && i < 4) || (handedOver && i === 4) || (handedOver && received && i === 5) ? "bg-lime" : "bg-background"}`}
            >
              {i < 2 ||
              (verified && i < 4) ||
              (handedOver && i === 4) ||
              (handedOver && received && i === 5) ? (
                <Check size={18} />
              ) : (
                i + 1
              )}
            </span>
            <p className="eyebrow mt-3">{s}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-[1.3fr_1fr] gap-7">
        <div className="panel p-7">
          <Badge tone={verified ? "lime" : "orange"}>
            {verified ? "OWNERSHIP VERIFIED BY FINDER" : "AWAITING FINDER VERIFICATION"}
          </Badge>
          <h2 className="text-2xl font-bold mt-5">A safe place. A happy reunion.</h2>
          <p className="text-sm mt-3 text-muted-foreground">
            {verified
              ? "Arrange a time together in your recovery chat."
              : "The finder must review your answers before you can arrange a return."}
          </p>
          <Button asChild variant="lime" className="mt-5">
            <Link to={verified ? "/messages" : "/claims"}>
              {verified ? "Open recovery chat" : "View claim"}
              <MessageSquare />
            </Link>
          </Button>
          <div className="border-t-2 border-foreground mt-7 pt-6">
            <h3 className="font-bold mb-4">Safe meeting checklist</h3>
            {[
              "Choose a public campus place in daylight.",
              "Confirm the item before completing the handover.",
              "Bring a friend if it makes you more comfortable.",
            ].map((c, i) => (
              <label key={c} className="flex items-start gap-3 text-sm my-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) =>
                    setChecks((p) => p.map((v, n) => (n === i ? e.target.checked : v)))
                  }
                  className="w-4 h-4 accent-primary mt-0.5"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="bg-pink/30 border-2 border-foreground p-7">
            <h2 className="text-2xl font-bold">The final little step.</h2>
            <p className="text-sm mt-3 mb-6">
              Both people confirm the return. Only tap when the item has actually changed hands.
            </p>
            <Button
              variant="outline"
              className="w-full mb-4"
              disabled={handedOver || !verified}
              onClick={() => confirm("handedOver")}
            >
              {handedOver ? (
                <>
                  <Check />
                  Handover confirmed
                </>
              ) : (
                "I Handed Over the Item"
              )}
            </Button>
            <Button
              variant="lime"
              className="w-full"
              disabled={received || !verified}
              onClick={() => confirm("received")}
            >
              {received ? (
                <>
                  <Check />
                  Receipt confirmed
                </>
              ) : (
                "I Received My Item"
              )}
            </Button>
            {(handedOver || received) && !(handedOver && received) && (
              <p className="text-xs mt-5">Waiting for the other person to confirm.</p>
            )}
            {handedOver && received && (
              <div className="mt-6">
                <Badge tone="mint">RETURN COMPLETED</Badge>
                <Button
                  asChild
                  className="w-full mt-5"
                  onClick={() =>
                    claims
                      .filter((c) => c.itemId === id && c.status === "Accepted")
                      .forEach((c) => updateClaim(c.id, "Completed"))
                  }
                >
                  <Link to="/returned/$id" params={{ id }}>
                    Celebrate & rate <Star />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <div className="mt-5">
            <TrustNote>
              Never share passwords, pay a release fee or meet at a private address.
            </TrustNote>
          </div>
        </div>
      </div>
    </Page>
  );
}
export function ReturnedPage({ id }: { id: string }) {
  const { rating, review, saveRating } = useKept();
  const [stars, setStars] = useState(rating);
  const [text, setText] = useState(review);
  const [saved, setSaved] = useState(false);
  const item = getItem(id);
  return (
    <Page eyebrow="A HAPPY ENDING / RETURN COMPLETE" title="Good things come back.">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-lime border-2 border-foreground p-9">
          <PartyPopper size={48} />
          <h2 className="section-title mt-6">
            {item?.title || "Your item"}.<br />
            Officially reunited.
          </h2>
          <p className="mt-5">A report. A little trust. One good human.</p>
          <div className="border-t-2 border-foreground mt-8 pt-6 grid grid-cols-2 gap-5">
            <div>
              <p className="text-4xl font-bold">+10</p>
              <p className="eyebrow mt-2">TRUST POINTS</p>
            </div>
            <div>
              <ShieldCheck size={35} />
              <p className="eyebrow mt-2">SUCCESSFUL HANDOVER</p>
            </div>
          </div>
          <Link to="/profile" className="subtle-link inline-block mt-7">
            See your trust profile ↗
          </Link>
        </div>
        <form
          className="panel p-8"
          onSubmit={(e) => {
            e.preventDefault();
            saveRating(stars, text);
            setSaved(true);
          }}
        >
          <h2 className="text-2xl font-bold">Give a little credit.</h2>
          <p className="text-sm mt-3 mb-6">
            How was the return? Your review helps build a kinder, more trusted community.
          </p>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setStars(n)}
                className="w-11 h-11"
              >
                <Star
                  size={30}
                  className={stars >= n ? "text-purple fill-purple" : "text-muted-foreground"}
                />
              </Button>
            ))}
          </div>
          <label className="field-label">
            A few kind words (optional)
            <textarea
              className="field min-h-36"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="They kept my item safe and made the handover easy..."
            />
          </label>
          <Button variant="pink" type="submit" className="mt-6" disabled={!stars || saved}>
            {saved ? (
              <>
                <Check />
                Review shared
              </>
            ) : (
              <>
                Share review <ArrowRight />
              </>
            )}
          </Button>
          {saved && (
            <p role="status" className="text-sm mt-4">
              Thanks! Your {stars}-star review is now on your trust profile.
            </p>
          )}
        </form>
      </div>
    </Page>
  );
}
