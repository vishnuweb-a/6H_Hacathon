# Kept: Campus Lost & Found

Create a polished desktop web UI prototype for a campus Lost & Found app called “Kept”, using separate routes/pages (not a collage). Visual style: neo-brutalist editorial portfolio aesthetic inspired by a cream grid-paper website with thick black borders, bold heavy typography, hot pink, acid lime, electric purple, orange and mint blocks, small monospace metadata, sticker doodles/arrows/stars, asymmetrical modular layout, and subtle offset shadows. Keep it clean, production-ready, and 1440px-first.

This is LOST & FOUND only; do not include lending/borrowing.

Brand: Kept. Tagline: “Lost it. Find it. Get it back.”
Core recovery flow: Report → Match → Claim → Verify → Connect → Meet → Return → Rate → Build Trust.
Privacy: approximate public locations, private identifying details hidden, no public phone/email, in-app communication, humans verify ownership.

Create navigable separate routes:
1 / Home — hero “Lost something? Check the board.”, Report Lost/Found CTAs, possible matches, recently lost/found, successful returns, trust strip.
2 /explore — search, Lost/Found/category/date/location/status filters, grid/list listings.
3 /listing/:id — image, public metadata, approximate location/time, privacy note, poster trust summary, CTA “This might be mine” for found items.
4 /post — “What happened?” with I Lost Something / I Found Something.
5 /post/lost — multi-step lost report: details, photo, approximate location/date/time, distinguishing characteristics, review.
6 /post/found — public details, photo, approximate location/date, PRIVATE identifying details, review. Clearly separate public vs private.
7 /matches — ranked “Very Strong Match / Strong Match / Possible Match” cards, similarity %, category/location/date-description factors; never claim confirmed ownership.
8 /claim/:id — ownership verification questions, Question 1 of 3, human-verification explanation.
9 /claims — Claims Sent / Claims Received with Pending, Accepted, Rejected, Cancelled, Completed; accept/reject for finder.
10 /messages — inbox left, active recovery chat right, item context, Plan handover.
11 /recovery/:id — timeline Match→Claim→Verified→Chat→Handover→Confirmation, safe meeting checklist, “I Handed Over the Item” / “I Received My Item”.
12 /returned/:id — successful return + 5-star rating/review + trust impact.
13 /activity — My Lost Reports, My Found Listings, Possible Matches, Claims Sent, Claims Received, Active Recoveries, Completed Returns.
14 /notifications — filters All/Matches/Claims/Messages; possible match, new claim, accepted/rejected, message, handover, returned, rating requested.
15 /profile — trust score, rating, items returned, handovers, badges, reviews, no sensitive info.
16 /safety — privacy + safe-handover guidance.
17 /auth — verified-college sign in/sign up.

Use realistic examples: grey hoodie, blue Casio calculator, student ID card, steel bottle, hostel key, AirPods case.
Use React + TypeScript + Tailwind + shadcn/ui + lucide. Local mock data only. Make tabs, filters, routing and multi-step forms work.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/34833871-f63b-454b-b80a-a807ab826018).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
