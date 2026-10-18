# CityClick: Engineering & Go-To-Market Roadmap

## Overview & Team Assignments

To move rapidly from architectural blueprint to live revenue-generating asset on `cityclick.com`, work is divided across Team Perry specialists with clear definitions of done (DoD) and dependency chains.

---

## 1. Specialist Workstream Allocations

| Role | Profile | Core Deliverable | Acceptance Gate |
| :--- | :--- | :--- | :--- |
| **Brand & Packaging** | `draper` | Brand design system, logo mark, color tokens, badge assets ("CityClick Certified"), mobile UI component kit | Draper Design Spec & SVG/CSS kit approved |
| **Direct Response Copy** | `clark` | High-converting emergency landing page framework, micro-copy, trust badges, phone CTA hooks, SMS alert scripts | Clark DR Copy Book & Hero Framework approved |
| **Lead Software Architect** | `woz` | Next.js 15 application scaffold, programmatic city/vertical page builder, Prisma/PostgreSQL schema, database seeds | Production-ready Next.js codebase with passing builds |
| **Full-Stack Developer** | `developer` | Telephony webhooks (Twilio/Ringba DNI), form handling API, instant contractor SMS dispatch engine | End-to-end API tests passing with mock telephony calls |
| **Webmaster & DevOps** | `webmaster` | Docker Compose staging deployment on `187.124.240.31`, Nginx reverse proxy, SSL cert, staging URL verification | Live, reachable HTTP/2 HTTPS endpoint on staging server |
| **Technical QA & Security**| `qa_tech` | Independent test suite: Lighthouse performance (>95 mobile), TCPA compliance audit, call routing verification | QA Sign-off report with zero P0/P1 blockers |

---

## 2. Sprint Timeline & Milestones

### Sprint 1: Foundation & Brand Engine (Days 1–5)
- [x] Product & Architecture Blueprint finalized (`t_d0fdd421`)
- [ ] Draper: Design system & UI tokens for CityClick
- [ ] Clark: Direct-response copy architecture & local dynamic text templates
- [ ] Woz: Next.js 15 repository scaffold, database schema & programmatic generator engine

### Sprint 2: Core Integration & Dynamic Telephony (Days 6–10)
- [ ] Developer: Twilio / Ringba telephony webhook integration & DNI engine
- [ ] Developer: 2-step lead capture micro-form with SMS alert dispatch
- [ ] Webmaster: Staging environment setup on `187.124.240.31` with automated Docker deployment

### Sprint 3: Texas Pilot Launch & QA Gate (Days 11–15)
- [ ] Ingest Texas 5 metro data (DFW, Houston, Austin, San Antonio, Midland/Odessa)
- [ ] Generate 25 flagship landing pages
- [ ] QA Tech: Full audit of performance, mobile viewport, telephony routing, and form capture
- [ ] Sophia: Executive review & Perry live sandbox presentation

### Sprint 4: National Scale & Contractor Monetization (Week 4+)
- [ ] Programmatic rollout of top 100 US cities (700 hubs)
- [ ] Self-serve contractor claiming portal with Stripe recurring billing
