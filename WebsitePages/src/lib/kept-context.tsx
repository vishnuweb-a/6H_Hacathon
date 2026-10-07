/**
 * Prototype client state for features that do not have a backend yet.
 *
 * Phase 1 removed the mock `signedIn` flag: authentication and the current profile
 * are real Supabase state, owned by `auth-context.tsx` and the profile query hooks.
 *
 * Phase 2 removed `reports` / `addReport`: listings are real Supabase state, owned
 * by TanStack Query through `hooks/use-listings.ts`. Nothing here mirrors them, so
 * there is exactly one owner of listing data.
 *
 * What remains (claims, chat, handover, rating) is still mock and is replaced in
 * its own later phase. The item fixtures those screens reference now live in
 * `demo-fixtures.ts`.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

export type ClaimStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";
export type Claim = {
  id: string;
  itemId: string;
  person: string;
  direction: "Sent" | "Received";
  status: ClaimStatus;
  answers: string[];
};
type KeptState = {
  claims: Claim[];
  addClaim: (itemId: string, answers: string[]) => void;
  updateClaim: (id: string, status: ClaimStatus) => void;
  messages: { text: string; mine: boolean }[];
  sendMessage: (text: string) => void;
  handedOver: boolean;
  received: boolean;
  confirm: (kind: "handedOver" | "received") => void;
  rating: number;
  review: string;
  saveRating: (rating: number, review: string) => void;
};
const KeptContext = createContext<KeptState | null>(null);
export function KeptProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>([
    {
      id: "claim-1",
      itemId: "hoodie",
      person: "Ananya Sharma",
      direction: "Sent",
      status: "Accepted",
      answers: ["Small stitched initials inside", "M", "Grey drawstrings"],
    },
    {
      id: "claim-2",
      itemId: "bottle",
      person: "Rohan Mehta",
      direction: "Received",
      status: "Pending",
      answers: ["A small dent on the base", "750 ml", "Black loop cap"],
    },
    {
      id: "claim-3",
      itemId: "airpods",
      person: "Isha Rao",
      direction: "Sent",
      status: "Rejected",
      answers: ["White case", "No engraving", "Second generation"],
    },
    {
      id: "claim-4",
      itemId: "key",
      person: "Dev Singh",
      direction: "Sent",
      status: "Cancelled",
      answers: [],
    },
    {
      id: "claim-5",
      itemId: "id-card",
      person: "Meera Patel",
      direction: "Received",
      status: "Completed",
      answers: ["Purple lanyard", "Arts", "Second year"],
    },
  ]);
  const [messages, setMessages] = useState([
    {
      text: "Hey! Your answers match the hoodie I found. Pretty sure we found its person :)",
      mine: false,
    },
    { text: "Amazing, thank you so much! I thought it was gone for good.", mine: true },
    { text: "No worries! Could we meet at the library help desk tomorrow?", mine: false },
  ]);
  const [handedOver, setHandedOver] = useState(false);
  const [received, setReceived] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  return (
    <KeptContext.Provider
      value={{
        claims,
        addClaim: (itemId, answers) =>
          setClaims((prev) => [
            {
              id: `claim-${Date.now()}`,
              itemId,
              answers,
              person: "You",
              direction: "Sent",
              status: "Pending",
            },
            ...prev,
          ]),
        updateClaim: (id, status) =>
          setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c))),
        messages,
        sendMessage: (text) => setMessages((prev) => [...prev, { text, mine: true }]),
        handedOver,
        received,
        confirm: (kind) => (kind === "handedOver" ? setHandedOver(true) : setReceived(true)),
        rating,
        review,
        saveRating: (r, text) => {
          setRating(r);
          setReview(text);
        },
      }}
    >
      {children}
    </KeptContext.Provider>
  );
}
export function useKept() {
  const context = useContext(KeptContext);
  if (!context) throw new Error("KeptProvider required");
  return context;
}
