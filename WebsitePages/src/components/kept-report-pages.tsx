import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  HandHeart,
  LockKeyhole,
  Globe,
  Upload,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import { Page, Badge, TrustNote } from "./kept-shared";
import { useKept } from "@/lib/kept-context";
import { categories, locations, items } from "@/lib/kept-data";

export function PostPage() {
  return (
    <Page
      eyebrow="EVERY REUNION STARTS HERE / REPORT"
      title="What happened?"
      description="Lost something or picked something up? You're in the right place."
    >
      <div className="grid md:grid-cols-2 gap-7 max-w-4xl">
        {[
          {
            type: "lost",
            title: "I lost something.",
            text: "Let’s help your thing find its way home.",
            Icon: Search,
            tone: "bg-pink",
            to: "/post/lost",
          },
          {
            type: "found",
            title: "I found something.",
            text: "You just made someone’s day a little better.",
            Icon: HandHeart,
            tone: "bg-lime",
            to: "/post/found",
          },
        ].map((c) => (
          <Link
            key={c.type}
            to={c.to as "/post/lost" | "/post/found"}
            className={`border-2 border-foreground shadow-brutal p-9 ${c.tone} hover:-translate-y-1 transition-transform`}
          >
            <c.Icon size={48} strokeWidth={1.5} />
            <h2 className="section-title mt-8">{c.title}</h2>
            <p className="mt-3">{c.text}</p>
            <ArrowRight className="mt-9" size={30} />
          </Link>
        ))}
      </div>
      <div className="mt-9 max-w-4xl">
        <TrustNote>
          Public details help make a match. Private details help prove it’s yours.
        </TrustNote>
      </div>
    </Page>
  );
}
export function ReportPage({ kind }: { kind: "lost" | "found" }) {
  const navigate = useNavigate();
  const { addReport } = useKept();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Clothing",
    description: "",
    location: "Central Library",
    date: "2026-10-07",
    time: "",
    privateDetails: "",
  });
  const [photo, setPhoto] = useState("");
  const found = kind === "found";
  const steps = [
    "The details",
    "A photo",
    "Where & when",
    found ? "Private details" : "Identifying details",
    "Review",
  ];
  const field = (name: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));
  const next = () => {
    if (step === 0 && (!form.title.trim() || !form.description.trim())) {
      setError("Add a title and description before continuing.");
      return;
    }
    if (step === 2 && !form.date) {
      setError("Choose a date before continuing.");
      return;
    }
    if (step === 3 && !form.privateDetails.trim()) {
      setError("Add at least one identifying detail. It stays private.");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  };
  const submit = () => {
    addReport({
      id: `report-${Date.now()}`,
      title: form.title,
      type: found ? "Found" : "Lost",
      category: form.category,
      description: form.description,
      location: form.location,
      date: form.date,
      time: form.time || "Time not specified",
      image: photo || items[0].image,
      person: "You",
      initials: "YO",
      status: "Open",
    });
    setDone(true);
  };
  if (done)
    return (
      <Page eyebrow="A GOOD FIRST STEP" title="Your report is on the board.">
        <div className="bg-lime border-2 border-foreground p-8 max-w-2xl">
          <Check size={48} />
          <h2 className="text-2xl font-bold mt-4">
            {found ? "Someone is going to be glad you found it." : "Let’s get it back to you."}
          </h2>
          <p className="mt-3">
            Your public details are live in this demo. Your identifying details remain private.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Button asChild>
              <Link to="/explore">
                View the board <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/matches">Possible matches</Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  return (
    <Page
      eyebrow={`REPORT / ${kind.toUpperCase()} ITEM`}
      title={found ? "Found it. Let’s return it." : "Lost it. Let’s find it."}
    >
      <div className="grid lg:grid-cols-[240px_1fr] gap-9">
        <aside>
          <div className="eyebrow mb-5">STEP {step + 1} OF 5</div>
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex gap-3 items-center py-4 border-b border-foreground/20 ${i === step ? "font-bold" : "text-muted-foreground"}`}
            >
              <span
                className={`w-7 h-7 border-2 border-foreground grid place-content-center text-xs ${i <= step ? "bg-lime text-foreground" : "bg-paper"}`}
              >
                {i < step ? <Check size={15} /> : i + 1}
              </span>
              {s}
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-6">Small details. Big difference.</p>
        </aside>
        <div className="panel p-6 md:p-9 max-w-3xl">
          <div className="flex justify-between gap-4 items-center mb-6">
            <h2 className="text-2xl font-bold">{steps[step]}</h2>
            <Badge tone={step === 3 ? "purple" : "mint"}>
              {step === 3 ? (
                <>
                  <LockKeyhole size={12} />
                  PRIVATE
                </>
              ) : (
                <>
                  <Globe size={12} />
                  PUBLIC
                </>
              )}
            </Badge>
          </div>
          {step === 0 && (
            <div className="grid gap-5">
              <label className="field-label">
                Item name
                <input
                  className="field"
                  placeholder="e.g. Grey oversized hoodie"
                  value={form.title}
                  onChange={(e) => field("title", e.target.value)}
                />
              </label>
              <label className="field-label">
                Category
                <select
                  className="field"
                  value={form.category}
                  onChange={(e) => field("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Public description
                <textarea
                  className="field min-h-28"
                  placeholder="Colour, item type and other general details. Leave unique identifying details for the private step."
                  value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                />
              </label>
            </div>
          )}
          {step === 1 && (
            <div>
              <label className="border-2 border-dashed border-foreground p-10 flex flex-col items-center gap-4 text-center cursor-pointer bg-background">
                <Upload size={35} />
                <span className="font-bold">Add a photo of the item</span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG or WEBP · Keep names and ID numbers out of frame.
                </span>
                <input
                  aria-label="Item photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPhoto(URL.createObjectURL(f));
                  }}
                  className="max-w-full text-xs"
                />
              </label>
              {photo && (
                <img
                  src={photo}
                  alt="Uploaded item preview"
                  className="w-40 h-40 object-cover mt-5 border-2 border-foreground"
                />
              )}
              <p className="text-xs mt-4">
                Photo optional. A sample photo is used if you skip this step.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-5">
              <TrustNote>Choose a campus area, not an exact room or personal address.</TrustNote>
              <label className="field-label">
                Approximate location
                <select
                  className="field"
                  value={form.location}
                  onChange={(e) => field("location", e.target.value)}
                >
                  {locations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="field-label">
                  Date
                  <input
                    type="date"
                    className="field"
                    value={form.date}
                    max="2026-10-07"
                    onChange={(e) => field("date", e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Approximate time (optional)
                  <input
                    className="field"
                    placeholder="e.g. around 3 PM"
                    value={form.time}
                    onChange={(e) => field("time", e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-5">
              <div className="bg-purple text-primary-foreground p-5 flex gap-3">
                <LockKeyhole className="shrink-0" />
                <div>
                  <h3 className="font-bold">Not shown on the board. Ever.</h3>
                  <p className="text-sm mt-2">
                    {found
                      ? "Keep a distinctive detail hidden. You’ll compare claim answers against it yourself."
                      : "Add details only you would know. These help the finder verify your ownership."}
                  </p>
                </div>
              </div>
              <label className="field-label">
                {found ? "Private identifying details" : "Distinguishing characteristics"}
                <textarea
                  className="field min-h-36"
                  placeholder="An inside label, an engraving, a small mark, or something inside a pocket..."
                  value={form.privateDetails}
                  onChange={(e) => field("privateDetails", e.target.value)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Do not include passwords, bank details or personal contact information.
              </p>
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-5">
              <div className="border-b-2 border-foreground pb-5">
                <Badge tone="mint">PUBLIC ON THE BOARD</Badge>
                <h3 className="text-2xl font-bold mt-4">{form.title}</h3>
                <p className="mt-2">{form.description}</p>
                <p className="eyebrow mt-4">
                  {form.category} · {form.location} · {form.date}
                </p>
                {photo && (
                  <img src={photo} alt="Report photo" className="w-28 h-28 object-cover mt-4" />
                )}
              </div>
              <div className="bg-purple/10 p-4 border-2 border-foreground">
                <Badge tone="purple">PRIVATE · NOT PUBLISHED</Badge>
                <p className="text-sm mt-3">{form.privateDetails}</p>
              </div>
              <TrustNote>
                People verify ownership. Kept suggests matches, never confirms them automatically.
              </TrustNote>
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm font-bold mt-5">
              {error}
            </p>
          )}
          <div className="flex justify-between mt-8 pt-6 border-t-2 border-foreground">
            <Button
              variant="outline"
              onClick={() => (step === 0 ? navigate({ to: "/post" }) : setStep((s) => s - 1))}
            >
              <ArrowLeft />
              Back
            </Button>
            {step < 4 ? (
              <Button variant="lime" onClick={next}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button variant="pink" onClick={submit}>
                Publish {kind} report <ArrowUpRightIcon />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight />;
}
