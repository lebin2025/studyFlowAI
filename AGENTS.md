# StudyFlow AI — Agent Instructions

## Design work

Before changing any page, component, layout, visual token, or interaction:

1. Read [`docs/design-kb.md`](docs/design-kb.md).
2. Query the local knowledge base under category `网页设计`, using **single keywords** such as `Apple`, `字体`, `动效`, `验收`, `无障碍`, `Glassmorphism`.
3. Read `00_SYSTEM_CORE.md` and, for visual direction, `16_APPLE_INSPIRED_DESIGN_SYSTEM.md`. For design decisions use `11`; for acceptance use `13`.
4. Inspect the actual current code and `src/assets/styles/tokens.css` before proposing changes.
5. Preserve working functionality and the existing warm, low-saturation visual language unless the user explicitly requests a new direction.

The original knowledge base lives at:

```text
C:\deepseek\AI_Web_Design_Knowledge_Base_v3\
```

Its 18 documents are imported into the local knowledge base (category `网页设计`). The source folder is authoritative if the imported copy and the files disagree.

## Product rules

- StudyFlow AI is an AI-native learning planner. The primary user task is completing today's study tasks.
- Primary art mode: **Precision Instrument** — warm-neutral, Apple-inspired tech minimalism: modern sans typography, data-first hierarchy, soft surfaces, precise spacing and one restrained brand accent. No editorial serif, no light/dark theme switch, no card-grid-by-default. Glass is reserved for floating controls, the quick panel and the focus overlay; ordinary page cards stay solid for readability.
- Visual motif: **the learning path** — each plan is a route from goal to today's next executable task. Data graphics carry the story; decoration does not.
- Global interaction layer: `FloatingOrb` + `FocusOverlay` are mounted in `App.vue`; focus, ambience and activity are Pinia stores; drafts are user-scoped local storage (`studyflow:drafts:v1:*`) until a server draft API exists. Do not describe local drafts as server-synced.
- Do not replace the design system without a stated reason.
- Do not use fake AI output, fake loading, or unlicensed cultural ornament.
- Keep the DeepSeek key and database credentials server-side only.

## Quality gate

For UI changes, run what is available:

```bash
npm run build
npm run test:unit -- --run
npm run test:server
```

Inspect the rendered page on desktop and mobile when possible, check keyboard access, focus states, horizontal overflow, empty/loading/error states, and `prefers-reduced-motion`. Report exactly what was actually verified; never claim screenshots or tests that were not run.

## Deployment

- Production: Render Free + Supabase PostgreSQL.
- URL: https://studyflow-ai-hntk.onrender.com
- Local default: SQLite; `DATABASE_URL` switches to PostgreSQL.
- Do not commit `.env`, `DATABASE_URL`, or API keys.
