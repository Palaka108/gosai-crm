# GOSAI CRM

Modern, modular CRM built for AI automation teams. Internal-first, designed to scale into a multi-tenant SaaS.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Data:** @tanstack/react-query + Supabase (Postgres + RLS)
- **Hosting:** Vercel
- **Domain:** crm.gosai.dev

## Getting Started

```bash
git clone https://github.com/Palaka108/gosai-crm.git
cd gosai-crm
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

## Supabase

All data lives in `gosai_*` tables on project `qwlbbcrjdpuxkavwyjyg`. No migrations needed — tables already exist with RLS enabled.

## Pages

- **Dashboard** — Metrics, recent activity, upcoming tasks
- **Contacts** — CRUD with status filtering, company linking
- **Companies** — CRUD with card layout, linked contacts/deals
- **Deals** — Pipeline with stage changes, activity logging
- **Projects** — CRUD with dates, budgets, status tracking
- **Tasks** — Global task list with quick-add, completion
- **Settings** — Application settings
