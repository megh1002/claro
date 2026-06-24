# Claro — Make the call you won't regret.

A multi-agent AI decision-making tool. Describe a decision you're stuck on — five specialized agents debate it in parallel and hand you a decisive verdict with a confidence score.

**Live:** https://claro-megh1002s-projects.vercel.app

---

## How it works

1. **Input** — describe your decision and select what matters most (money, stability, growth, etc.)
2. **Clarify** — an intake agent generates 3 tailored questions to sharpen the verdict
3. **Debate** — 5 agents run in parallel:
   - **Facts** — objective realities of each option
   - **Risks** — what could go wrong and how likely
   - **Tradeoffs** — gains and losses on your stated priorities
   - **Devil's Advocate** — argues hard against the obvious choice
   - **The Call** — weighs all four and delivers a decisive recommendation
4. **Verdict** — confidence score, explanation, and one concrete next step
5. **Journal** — save decisions, revisit them later, and log how they turned out

---

## Architecture

- **Frontend:** Next.js 14 (App Router), TypeScript, React
- **AI:** Groq API (LLaMA 3.3 70B) — 5 agents orchestrated with `Promise.all` for parallel execution
- **Streaming:** Server-Sent Events (SSE) — responses stream live to the client as agents work
- **Database + Auth:** Supabase (Postgres with row-level security)
- **Rate limiting:** In-memory IP-based limiting (10 req/hr)
- **Deployment:** Vercel

---

## Running locally

```bash
git clone https://github.com/YOUR_USERNAME/claro.git
cd claro
npm install
```

Create a `.env.local`:
```
GROQ_API_KEY=your_groq_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```bash
npm run dev
```

---

## Agent prompts

Each agent lives in `/agents/*.md` — plain markdown files loaded at runtime. The coordinator assigns each agent a decision-specific question before they run in parallel.

---

Built by [Meghna Sarda](https://www.linkedin.com/in/meghna-sarda)
