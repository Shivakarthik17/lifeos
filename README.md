# LifeOS — Landing Page

A Next.js 14 + TypeScript + Tailwind landing page for **LifeOS**, a personal life management app for disciplined growth across six pillars:
Finance, Fitness, Mind, Business, Daily Discipline, and People.

## Prerequisites

Node.js was **not installed** on this machine, so the project was scaffolded manually instead of via `create-next-app`. Before running:

1. Install Node.js LTS (v18.18+ or v20+) from https://nodejs.org/
2. Reopen your terminal so `node` and `npm` are on your PATH.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Build for production

```bash
npm run build
npm run start
```

## Project structure

```
app/
  layout.tsx        Root layout (Inter font, dark theme)
  page.tsx          Composes all 6 landing-page sections
  globals.css       Tailwind base + dark theme tokens
components/
  Navbar.tsx        Sticky nav: LifeOS logo + "Get Early Access"
  Hero.tsx          Headline + waitlist email capture (client component)
  Features.tsx      6 pillar cards with icons
  HowItWorks.tsx    3-step Track / Analyze / Improve flow
  Waitlist.tsx      Second email-capture CTA (client component)
  Footer.tsx        Copyright + links
tailwind.config.ts  Custom theme: #7F77DD accent, deep-navy palette
```

## Design tokens

| Token       | Value                  |
|-------------|------------------------|
| background  | `#070B1A` (deep navy)  |
| surface     | `#0E1430`              |
| accent      | `#7F77DD` (purple)     |
| accent.hover| `#9089E6`              |
| muted text  | `#9AA3C7`              |
