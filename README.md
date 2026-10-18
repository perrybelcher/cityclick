# CityClick (`cityclick.com`)

Category-dominant, hyper-local pay-per-call and verified service marketplace built on Perry Belcher's exact-match domain **`cityclick.com`**.

---

## Strategic Blueprint & Documentation

* **Master Blueprint:** [`BLUEPRINT.md`](./BLUEPRINT.md) — Executive strategy, high-ticket wedges, and 3-tier monetization model.
* **System Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Technical specifications, Next.js 15 app structure, Prisma database schema, and telephony call flow.
* **Verticals & Economics:** [`VERTICALS_AND_MONETIZATION.md`](./VERTICALS_AND_MONETIZATION.md) — High-ticket services breakdown, payout benchmarks, and financial projections.
* **Roadmap & Specialist Tasks:** [`ROADMAP.md`](./ROADMAP.md) — Sprint roadmap, specialist assignments (Woz, Draper, Clark, Developer, Webmaster, QA Tech), and acceptance criteria.

---

## Tech Stack
* **Frontend:** Next.js 15 (App Router, Server Components, SSG/ISR) + Tailwind CSS + Lucide
* **Backend:** Node.js / TypeScript / Next.js Server Actions & API Routes
* **Database:** PostgreSQL / Prisma ORM
* **Telephony & Messaging:** Twilio Voice & SMS / Ringba Dynamic Number Insertion
* **Deployment:** Docker Compose on Ubuntu Staging Node (`187.124.240.31`) behind Nginx reverse proxy
* **CDN / Edge:** Cloudflare
