import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  HandHeart,
  LockKeyhole,
  Globe,
  Upload,
  Check,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { z } from "zod";
import { Button } from "./ui/button";
import { Page, Badge, TrustNote } from "./kept-shared";
import { useCreateFoundItem, useCreateLostItem } from "@/hooks/use-listings";
import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  MAX_ITEM_IMAGES,
  categoryLabel,
  type CreateFoundListingInput,
  type CreateLostReportInput,
  type ItemCategory,
} from "@/lib/services/listing-types";
import { MediaValidationError, validateImageFile } from "@/lib/services/media-service";

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
            <c.Icon size={48} strokeWidth={1.5} aria-hidden="true" />
            <h2 className="section-title mt-8">{c.title}</h2>
            <p className="mt-3">{c.text}</p>
            <ArrowRight className="mt-9" size={30} aria-hidden="true" />
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

/**
 * Client-side validation mirrors the database constraints in
 * supabase/migrations/20261007160000_listings_and_media.sql, so a person sees the
 * problem before a round trip. The database stays the authority
 * (docs/securityAndService.md §81, §105).
 */
const titleSchema = z
  .string()
  .trim()
  .min(3, "Give the item a name of at least 3 characters.")
  .max(120, "Item names are up to 120 characters.");
const descriptionSchema = z
  .string()
  .trim()
  .min(10, "Add a description of at least 10 characters.")
  .max(1000, "Descriptions are up to 1000 characters.");
const locationSchema = z
  .string()
  .trim()
  .min(2, "Choose or type an approximate location.")
  .max(255, "Locations are up to 255 characters.");
const questionSchema = z
  .string()
  .trim()
  .min(5, "A verification question needs at least 5 characters.")
  .max(300, "Questions are up to 300 characters.");

/** docs/database.md §18 — the date cannot be in the future. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type PrivateDetailsForm = {
  privateNotes: string;
  serialFragment: string;
  uniqueMarkings: string;
  privateContents: string;
};

type SelectedImage = { file: File; previewUrl: string };

/**
 * The approved five-step report wizard, now writing to Supabase.
 *
 * The step sequence, copy, badges and layout are unchanged. What changed:
 *   - fields map onto the documented `items` columns (brand/colour added, category
 *     is the stored slug rather than a display label)
 *   - photos are real uploads, validated before they are accepted
 *   - the FOUND private step collects the four documented private fields and the
 *     Finder's verification questions, instead of one free-text box
 *   - submit, success, upload-failure and backend-error states are real
 */
export function ReportPage({ kind }: { kind: "lost" | "found" }) {
  const navigate = useNavigate();
  const found = kind === "found";
  const errorId = useId();

  const createLost = useCreateLostItem();
  const createFound = useCreateFoundItem();
  const mutation = found ? createFound : createLost;

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ itemId: string; failedImageCount: number } | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "other" as ItemCategory,
    brand: "",
    color: "",
    description: "",
    locationText: "",
    eventDate: todayIso(),
    eventTime: "",
  });
  const [privateDetails, setPrivateDetails] = useState<PrivateDetailsForm>({
    privateNotes: "",
    serialFragment: "",
    uniqueMarkings: "",
    privateContents: "",
  });
  const [questions, setQuestions] = useState<string[]>([""]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  // Guards against a double-submit from a fast second click or an Enter keypress.
  const submittingRef = useRef(false);

  const steps = [
    "The details",
    "A photo",
    "Where & when",
    found ? "Private details" : "Identifying details",
    "Review",
  ];

  const field = (name: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_ITEM_IMAGES - images.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_ITEM_IMAGES} photos.`);
      return;
    }

    const accepted: SelectedImage[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        validateImageFile(file);
        accepted.push({ file, previewUrl: URL.createObjectURL(file) });
      } catch (cause) {
        setError(
          cause instanceof MediaValidationError ? cause.message : "That photo could not be added.",
        );
        continue;
      }
    }
    if (accepted.length > 0) {
      setError("");
      setImages((prev) => [...prev, ...accepted]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const hasAnyPrivateDetail = Object.values(privateDetails).some(
    (value) => value.trim().length > 0,
  );

  const next = () => {
    if (step === 0) {
      const title = titleSchema.safeParse(form.title);
      if (!title.success) {
        setError(title.error.issues[0]?.message ?? "Check the item name.");
        return;
      }
      const description = descriptionSchema.safeParse(form.description);
      if (!description.success) {
        setError(description.error.issues[0]?.message ?? "Check the description.");
        return;
      }
    }
    if (step === 2) {
      const location = locationSchema.safeParse(form.locationText);
      if (!location.success) {
        setError(location.error.issues[0]?.message ?? "Check the location.");
        return;
      }
      if (!form.eventDate) {
        setError("Choose a date before continuing.");
        return;
      }
      if (form.eventDate > todayIso()) {
        setError("The date cannot be in the future.");
        return;
      }
    }
    if (step === 3) {
      if (!hasAnyPrivateDetail) {
        setError(
          found
            ? "Add at least one private detail. It is never shown on the board."
            : "Add at least one identifying detail. It stays private.",
        );
        return;
      }
      if (found) {
        const filled = questions.map((q) => q.trim()).filter((q) => q.length > 0);
        for (const question of filled) {
          const parsed = questionSchema.safeParse(question);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Check your questions.");
            return;
          }
        }
      }
    }
    setError("");
    setStep((s) => s + 1);
  };

  const submit = async () => {
    if (submittingRef.current || mutation.isPending) return;
    submittingRef.current = true;
    setError("");

    const base = {
      title: form.title.trim(),
      category: form.category,
      brand: form.brand.trim() || null,
      color: form.color.trim() || null,
      description: form.description.trim(),
      eventDate: form.eventDate,
      eventTime: form.eventTime || null,
      locationText: form.locationText.trim(),
    };
    // Both flows collect the same four private fields, and both now persist them:
    // a FOUND listing to `found_item_private_details`, a LOST report to
    // `lost_item_private_details`. Neither is ever published.
    const privateDetailsInput = {
      privateNotes: privateDetails.privateNotes.trim() || null,
      serialFragment: privateDetails.serialFragment.trim() || null,
      uniqueMarkings: privateDetails.uniqueMarkings.trim() || null,
      privateContents: privateDetails.privateContents.trim() || null,
    };
    const files = images.map((image) => image.file);

    try {
      if (found) {
        const input: CreateFoundListingInput = {
          ...base,
          privateDetails: privateDetailsInput,
          verificationQuestions: questions
            .map((question, index) => ({ question: question.trim(), position: index }))
            .filter((entry) => entry.question.length > 0)
            .map((entry, index) => ({ question: entry.question, position: index })),
        };
        const created = await createFound.mutateAsync({ input, images: files });
        setResult({ itemId: created.itemId, failedImageCount: created.failedImageCount });
      } else {
        const input: CreateLostReportInput = { ...base, privateDetails: privateDetailsInput };
        const created = await createLost.mutateAsync({ input, images: files });
        setResult({ itemId: created.itemId, failedImageCount: created.failedImageCount });
      }
      // Previews are no longer needed once the upload has happened.
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not publish your report. Please try again.",
      );
    } finally {
      submittingRef.current = false;
    }
  };

  if (result) {
    return (
      <Page eyebrow="A GOOD FIRST STEP" title="Your report is on the board.">
        <div className="bg-lime border-2 border-foreground p-8 max-w-2xl">
          <Check size={48} aria-hidden="true" />
          <h2 className="text-2xl font-bold mt-4">
            {found ? "Someone is going to be glad you found it." : "Let’s get it back to you."}
          </h2>
          <p className="mt-3">
            Your public details are live on the board.
            {found
              ? " Your private details and questions stay with you."
              : " Your identifying details stay private."}
          </p>
          {result.failedImageCount > 0 && (
            <p role="alert" className="mt-4 flex gap-2 items-start text-sm font-bold">
              <TriangleAlert size={18} className="shrink-0" aria-hidden="true" />
              {result.failedImageCount === 1
                ? "One photo could not be uploaded, so it is not on your listing. You can add it from the listing."
                : `${result.failedImageCount} photos could not be uploaded, so they are not on your listing. You can add them from the listing.`}
            </p>
          )}
          <div className="flex flex-wrap gap-4 mt-6">
            <Button asChild>
              <Link to="/listing/$id" params={{ id: result.itemId }}>
                View your listing <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/explore">View the board</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/activity">My activity</Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const isSubmitting = mutation.isPending;

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
                {i < step ? <Check size={15} aria-hidden="true" /> : i + 1}
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
                  <LockKeyhole size={12} aria-hidden="true" />
                  PRIVATE
                </>
              ) : (
                <>
                  <Globe size={12} aria-hidden="true" />
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
                  maxLength={120}
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
                  {ITEM_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="field-label">
                  Brand (optional)
                  <input
                    className="field"
                    placeholder="e.g. Casio"
                    maxLength={120}
                    value={form.brand}
                    onChange={(e) => field("brand", e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Colour (optional)
                  <input
                    className="field"
                    placeholder="e.g. Grey"
                    maxLength={80}
                    value={form.color}
                    onChange={(e) => field("color", e.target.value)}
                  />
                </label>
              </div>
              <label className="field-label">
                Public description
                <textarea
                  className="field min-h-28"
                  placeholder="Colour, item type and other general details. Leave unique identifying details for the private step."
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="border-2 border-dashed border-foreground p-10 flex flex-col items-center gap-4 text-center cursor-pointer bg-background">
                <Upload size={35} aria-hidden="true" />
                <span className="font-bold">Add up to {MAX_ITEM_IMAGES} photos of the item</span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG or WebP · up to 5 MB each · Keep names and ID numbers out of frame.
                </span>
                <input
                  aria-label="Item photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={images.length >= MAX_ITEM_IMAGES}
                  onChange={(e) => {
                    addImages(e.target.files);
                    // Allow re-selecting the same file after a removal.
                    e.target.value = "";
                  }}
                  className="max-w-full text-xs"
                />
              </label>
              {images.length > 0 && (
                <ul className="flex flex-wrap gap-4 mt-5 list-none p-0">
                  {images.map((image, index) => (
                    <li key={image.previewUrl} className="relative">
                      <img
                        src={image.previewUrl}
                        alt={`Selected photo ${index + 1}`}
                        className="w-32 h-32 object-cover border-2 border-foreground"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="absolute -top-3 -right-3 bg-paper"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => removeImage(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs mt-4">
                Photos are optional, and are resized and stripped of location data before upload.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <TrustNote>Choose a campus area, not an exact room or personal address.</TrustNote>
              <label className="field-label">
                Approximate location
                <input
                  className="field"
                  placeholder="e.g. Central Library"
                  maxLength={255}
                  value={form.locationText}
                  onChange={(e) => field("locationText", e.target.value)}
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="field-label">
                  Date
                  <input
                    type="date"
                    className="field"
                    value={form.eventDate}
                    max={todayIso()}
                    onChange={(e) => field("eventDate", e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Approximate time (optional)
                  <input
                    type="time"
                    className="field"
                    value={form.eventTime}
                    onChange={(e) => field("eventTime", e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5">
              <div className="bg-purple text-primary-foreground p-5 flex gap-3">
                <LockKeyhole className="shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-bold">Not shown on the board. Ever.</h3>
                  <p className="text-sm mt-2">
                    {found
                      ? "Keep the distinctive details hidden. You’ll compare claim answers against them yourself."
                      : "Add details only you would know. These help the finder verify your ownership."}
                  </p>
                </div>
              </div>
              <label className="field-label">
                {found ? "Private notes" : "Distinguishing characteristics"}
                <textarea
                  className="field min-h-28"
                  placeholder="An inside label, an engraving, a small mark, or something inside a pocket..."
                  maxLength={1000}
                  value={privateDetails.privateNotes}
                  onChange={(e) =>
                    setPrivateDetails((prev) => ({ ...prev, privateNotes: e.target.value }))
                  }
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="field-label">
                  Part of a serial number (optional)
                  <input
                    className="field"
                    placeholder="Last few characters only"
                    maxLength={120}
                    value={privateDetails.serialFragment}
                    onChange={(e) =>
                      setPrivateDetails((prev) => ({ ...prev, serialFragment: e.target.value }))
                    }
                  />
                </label>
                <label className="field-label">
                  Unique markings (optional)
                  <input
                    className="field"
                    placeholder="e.g. scratch near the corner"
                    maxLength={1000}
                    value={privateDetails.uniqueMarkings}
                    onChange={(e) =>
                      setPrivateDetails((prev) => ({ ...prev, uniqueMarkings: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="field-label">
                What was inside or attached (optional)
                <input
                  className="field"
                  placeholder="e.g. a college ID inside the wallet"
                  maxLength={1000}
                  value={privateDetails.privateContents}
                  onChange={(e) =>
                    setPrivateDetails((prev) => ({ ...prev, privateContents: e.target.value }))
                  }
                />
              </label>

              {found && (
                <fieldset className="border-2 border-foreground p-5">
                  <legend className="eyebrow px-2">
                    QUESTIONS FOR WHOEVER CLAIMS IT (OPTIONAL)
                  </legend>
                  <p className="text-sm mb-4">
                    Ask something only the owner could answer. You will compare the answers yourself
                    — Scout never decides a claim for you.
                  </p>
                  <div className="grid gap-3">
                    {questions.map((question, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <label className="field-label flex-1">
                          <span className="sr-only">Question {index + 1}</span>
                          <input
                            className="field"
                            placeholder="e.g. What is on the keyring?"
                            maxLength={300}
                            value={question}
                            onChange={(e) =>
                              setQuestions((prev) =>
                                prev.map((q, i) => (i === index ? e.target.value : q)),
                              )
                            }
                          />
                        </label>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label={`Remove question ${index + 1}`}
                            onClick={() =>
                              setQuestions((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {questions.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setQuestions((prev) => [...prev, ""])}
                    >
                      <Plus size={16} /> Add another question
                    </Button>
                  )}
                </fieldset>
              )}

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
                <p className="mt-2 whitespace-pre-line">{form.description}</p>
                <p className="eyebrow mt-4">
                  {categoryLabel(form.category)} · {form.locationText} · {form.eventDate}
                  {form.eventTime ? ` · ${form.eventTime}` : ""}
                </p>
                {(form.brand || form.color) && (
                  <p className="eyebrow text-muted-foreground mt-2">
                    {[form.brand, form.color].filter(Boolean).join(" · ")}
                  </p>
                )}
                {images.length > 0 && (
                  <ul className="flex flex-wrap gap-3 mt-4 list-none p-0">
                    {images.map((image, index) => (
                      <li key={image.previewUrl}>
                        <img
                          src={image.previewUrl}
                          alt={`Report photo ${index + 1}`}
                          className="w-28 h-28 object-cover border-2 border-foreground"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-purple/10 p-4 border-2 border-foreground">
                <Badge tone="purple">PRIVATE · NOT PUBLISHED</Badge>
                <dl className="text-sm mt-3 grid gap-2">
                  {(
                    [
                      ["Notes", privateDetails.privateNotes],
                      ["Serial fragment", privateDetails.serialFragment],
                      ["Unique markings", privateDetails.uniqueMarkings],
                      ["Contents", privateDetails.privateContents],
                    ] as const
                  )
                    .filter(([, value]) => value.trim().length > 0)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="eyebrow text-muted-foreground">{label}</dt>
                        <dd className="mt-1">{value}</dd>
                      </div>
                    ))}
                </dl>
                {found && questions.some((q) => q.trim().length > 0) && (
                  <>
                    <p className="eyebrow text-muted-foreground mt-4">YOUR QUESTIONS</p>
                    <ol className="text-sm mt-2 grid gap-1 pl-5">
                      {questions
                        .filter((q) => q.trim().length > 0)
                        .map((q, index) => (
                          <li key={index}>{q.trim()}</li>
                        ))}
                    </ol>
                  </>
                )}
              </div>
              <TrustNote>
                People verify ownership. Scout suggests matches, never confirms them automatically.
              </TrustNote>
            </div>
          )}

          {error && (
            <p role="alert" id={errorId} className="text-destructive text-sm font-bold mt-5">
              {error}
            </p>
          )}
          {isSubmitting && (
            <p role="status" aria-live="polite" className="text-sm font-bold mt-5">
              {images.length > 0
                ? "Publishing your report and uploading photos…"
                : "Publishing your report…"}
            </p>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t-2 border-foreground">
            <Button
              variant="outline"
              disabled={isSubmitting}
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
              <Button
                variant="pink"
                disabled={isSubmitting}
                aria-describedby={error ? errorId : undefined}
                onClick={() => void submit()}
              >
                {isSubmitting ? "Publishing…" : `Publish ${kind} report`}
                {!isSubmitting && <ArrowRight />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
