import hoodie from "@/assets/hoodie.jpg";
import calculator from "@/assets/calculator.jpg";
import bottle from "@/assets/bottle.jpg";
import idCard from "@/assets/id.jpg";
import key from "@/assets/key.jpg";
import airpods from "@/assets/airpods.jpg";

export type Item = {
  id: string;
  title: string;
  type: "Lost" | "Found";
  category: string;
  location: string;
  date: string;
  time: string;
  image: string;
  description: string;
  person: string;
  initials: string;
  status: string;
};
export const items = [
  {
    id: "hoodie",
    title: "Grey oversized hoodie",
    type: "Found",
    category: "Clothing",
    location: "Central Library",
    date: "2026-10-07",
    time: "Around 10:30 AM",
    image: hoodie,
    description:
      "A grey pullover hoodie, size M/L, found near the reading area. Keeping it safe until its person finds it.",
    person: "Ananya Sharma",
    initials: "AS",
    status: "Open",
  },
  {
    id: "calculator",
    title: "Blue Casio calculator",
    type: "Lost",
    category: "Electronics",
    location: "Engineering Block",
    date: "2026-10-07",
    time: "Around 9:00 AM",
    image: calculator,
    description:
      "Blue scientific calculator last seen after my morning lecture. It has a small identifying mark on the back.",
    person: "Rohan Mehta",
    initials: "RM",
    status: "Open",
  },
  {
    id: "bottle",
    title: "Steel water bottle",
    type: "Found",
    category: "Everyday essentials",
    location: "Student Café",
    date: "2026-10-06",
    time: "Around 3:00 PM",
    image: bottle,
    description: "Silver steel water bottle with a black cap. Found near the outdoor tables.",
    person: "Kabir Shah",
    initials: "KS",
    status: "Open",
  },
  {
    id: "id-card",
    title: "Student ID card",
    type: "Found",
    category: "Cards & documents",
    location: "Arts Block",
    date: "2026-10-06",
    time: "Afternoon",
    image: idCard,
    description: "Student ID with a purple lanyard. Personal details are hidden for privacy.",
    person: "Meera Patel",
    initials: "MP",
    status: "Open",
  },
  {
    id: "key",
    title: "Hostel key with blue tag",
    type: "Lost",
    category: "Keys",
    location: "North Hostel",
    date: "2026-10-05",
    time: "Evening",
    image: key,
    description: "Single silver key with a blue tag, probably lost on the walk back from class.",
    person: "Dev Singh",
    initials: "DS",
    status: "Open",
  },
  {
    id: "airpods",
    title: "White AirPods case",
    type: "Found",
    category: "Electronics",
    location: "Sports Complex",
    date: "2026-10-05",
    time: "Around 5:00 PM",
    image: airpods,
    description:
      "White earbud charging case found by the benches. Tell me the details only the owner would know.",
    person: "Isha Rao",
    initials: "IR",
    status: "Open",
  },
] as const satisfies readonly Item[];

// Mutable seed for client state: `items` keeps its fixed-length inference so the
// demo pages can index it directly, while `seedItems` is the reusable collection
// type state can prepend to.
export const seedItems: Item[] = [...items];
export const getItem = (id: string) => items.find((item) => item.id === id);
export const categories = [
  "Clothing",
  "Electronics",
  "Everyday essentials",
  "Cards & documents",
  "Keys",
];
export const locations = [
  "Central Library",
  "Engineering Block",
  "Student Café",
  "Arts Block",
  "North Hostel",
  "Sports Complex",
];
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
