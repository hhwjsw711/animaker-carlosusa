# Architecture

Comprehensive project architecture reference. This document captures everything needed to understand and work on this codebase.

## Project Overview

**Vertex** is an AI-powered business management platform that integrates customers, services, products, calendar, finance, and team management through AI assistants and autonomous agents.

- **Site**: https://vertex.app
- **Primary market**: Brazil (pt-BR is the default language)
- **Supported languages**: pt-BR (default, no URL prefix), en-US (`/en` prefix), zh-CN (`/zh` prefix)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TanStack Start (SSR) + TanStack Router (file-based routing) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Base UI primitive, `base-nova` style) |
| **State** | Zustand stores |
| **Data fetching** | TanStack React Query + Convex Query Client (`@convex-dev/react-query`) |
| **Auth** | Convex Auth (`@convex-dev/auth`) — OTP/email |
| **Backend** | Convex (`convex/` directory) |
| **Deployment** | Cloudflare Pages (project `nivo-root`) + Cloudflare Workers (SSR via `src/worker.ts`) |
| **i18n** | i18next + react-i18next |
| **Icons** | Lucide icons (always `size-4.5`, stroke-width 1.5 defined in CSS) |
| **Font** | Inter Variable (woff2 in `/public/fonts/`) |
| **Build** | Vite + Cloudflare Vite plugin |

### Init Skill Files

When working with these technologies, read the corresponding init file first:
- Shadcn/ui → `docs/prompts/shadcn-specialist-init.md`
- Tailwind v4 → `docs/prompts/tailwind-specialist-init.md`
- Convex → `docs/prompts/convex-specialist-init.md` (+ always read `convex/_generated/ai/guidelines.md`)
- Cloudflare → `docs/prompts/cloudflare-specialist-init.md`
- Vite → `docs/prompts/vite-specialist-init.md`

---

## Architecture Diagram

```
                    ┌─────────────────────────────────┐
                    │        Cloudflare Pages          │
                    │   Static files (prerendered)     │
                    │   /, /en, /zh, /privacy, ...     │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │    Cloudflare Worker (SSR)       │
                    │    src/worker.ts                 │
                    │    + /sitemap.xml generator      │
                    └──────────┬──────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐          ┌─────▼─────┐
    │TanStack │          │  i18n   │          │  Convex   │
    │ Router  │◄────────►│(locale- │◄────────►│  Backend  │
    │(routes/) │  rewrite │routing) │  queries │           │
    └─────────┘          └─────────┘          └───────────┘
         │
    ┌────▼────────────────────┐
    │  React Components       │
    │  (components/ by feature)│
    │  + Zustand stores       │
    └─────────────────────────┘
```

---

## Source Structure (`src/`)

```
src/
├── components/              # Feature-organized components
│   ├── ui/                  # shadcn/ui primitives (Base UI)
│   │   └── custom/          # Custom: spinner, logo, animated-list, etc.
│   ├── layout/              # NavDesktop, NavMobile, DynamicContentWrapper
│   ├── chat/                # AI chat + tool-call components
│   ├── customers/           # Customer CRM
│   ├── services/            # Services management
│   ├── products/            # Products management
│   ├── collaborators/       # Collaborators/team
│   ├── calendar/            # Calendar/appointments
│   ├── finance/             # Financial management
│   ├── agents/              # AI agents
│   ├── skills/              # AI skills
│   ├── onboarding/          # Onboarding flow
│   ├── profile/             # User profile
│   ├── landing/             # Public landing page
│   ├── legal/               # Privacy & Terms (per language)
│   ├── auth/                # Auth components
│   └── usage/               # Usage/billing pages
├── hooks/                   # Custom hooks
├── i18n/                    # i18n configuration
│   ├── config.ts            # i18next init, getInitialLang, persistUserLang
│   ├── locale-routing.ts    # Prefix mapping, deLocalizeUrl, localizeUrl, getCurrentLang
│   └── types.ts             # i18next module augmentation
├── lib/                     # Utilities
│   ├── utils.ts             # cn() and misc utils
│   ├── constants.ts         # Streaming timeouts, UI constants
│   ├── staff-pages.ts       # STAFF_PAGES access control
│   ├── date-mask.ts         # Date input mask per locale
│   ├── billing-utils.ts     # Billing date parsing (allows future dates)
│   ├── document-mask.ts     # Document mask (CPF/SSN) per locale
│   ├── format-date.ts       # Intl.DateTimeFormat wrapper
│   ├── format-relative-time.ts # Relative time formatting
│   ├── format-currency.ts   # Currency formatting
│   ├── format-initials.ts   # Name initials
│   └── seo-head.ts          # SEO meta/head builder
├── locales/                 # Translation JSON files (909 keys each)
│   ├── pt-BR/translation.json
│   ├── en-US/translation.json
│   └── zh-CN/translation.json
├── routes/                  # TanStack file-based routing
│   ├── __root.tsx           # Root route: locale context, theme, <html lang>
│   ├── index.tsx            # Landing page (public, prerendered)
│   ├── privacy.tsx          # Privacy policy (public, prerendered)
│   ├── terms.tsx            # Terms of service (public, prerendered)
│   ├── signin.tsx           # Sign in (client-side only)
│   ├── signup.tsx           # Sign up (client-side only)
│   ├── recover.tsx          # Password recovery (client-side only)
│   ├── _app.tsx             # Authenticated app layout
│   └── _app.*.tsx           # Authenticated pages (chat, customers, etc.)
├── stores/                  # Zustand stores
├── types/                   # TypeScript shared types
├── router.tsx               # Router configuration with locale rewrite
├── worker.ts                # Cloudflare Worker entry (SSR + sitemap.xml)
└── index.css                # Tailwind + theme CSS variables
```

---

## i18n System

### Supported Locales

| Locale | Label | URL Prefix | og:locale | Date Format |
|---|---|---|---|---|
| `pt-BR` | Português | none (root `/`) | `pt_BR` | DD/MM/YYYY |
| `en-US` | English | `/en` | `en_US` | MM/DD/YYYY |
| `zh-CN` | 简体中文 | `/zh` | `zh_CN` | YYYY/MM/DD |

### Core Files

**`src/i18n/locale-routing.ts`** — Single source of truth for locale routing:
- `PREFIX_TO_LANG`: `{ en: "en-US", zh: "zh-CN" }`
- `LANG_TO_PREFIX`: `{ "en-US": "en", "zh-CN": "zh", "pt-BR": null }`
- `deLocalizeUrl(url)`: strips locale prefix for route matching
- `localizeUrl(url, lang)`: adds locale prefix for output links
- `getCurrentLang()`: isomorphic — server reads cookie + Accept-Language header; client reads cookie + navigator.language
- `langPrefix(lang)`: returns `/en`, `/zh`, or `""`

**`src/i18n/config.ts`** — i18next initialization:
- `resources`: imports all 3 translation JSONs
- `getInitialLang()`: SSR-safe initial language detection (URL path → cookie → default pt-BR)
- `persistUserLang(lang)`: called by language switchers, writes `nivo-lang` cookie (1 year, SameSite=Lax)
- `fallbackLng`: `"pt-BR"`

**`src/i18n/types.ts`** — i18next module augmentation using `typeof enUS` for resource typing. Since all 3 locales have identical key structure (909 keys), TypeScript validates all translations correctly.

### Language Detection Flow

```
Request arrives
    │
    ├─ SSR (server):
    │   1. Read nivo-lang cookie → if valid (en-US, pt-BR, zh-CN), use it
    │   2. Read Accept-Language header → regex match /^zh/, /^en/ → fallback pt-BR
    │
    ├─ Client (browser):
    │   1. Read nivo-lang cookie → if valid, use it
    │   2. Check navigator.language → /^zh/ → zh-CN, /^en/ → en-US, fallback pt-BR
    │
    └─ Prerender (build time):
        Vite injects Accept-Language header per path:
        / → pt-BR, /en → en-US, /zh → zh-CN, etc.
```

### Router Rewrite

TanStack Router bidirectional rewrite in `src/router.tsx`:
- **input**: `deLocalizeUrl` strips `/en` or `/zh` before route matching → route tree stays un-duplicated
- **output**: `localizeUrl` adds current user's prefix to `<Link>` targets

### Language Switchers

Three language switchers exist, all with pt-BR / en-US / zh-CN options:

| Location | File | Behavior |
|---|---|---|
| Landing footer | `components/landing/landing-footer.tsx` | `persistUserLang` → navigate to `/` |
| Authenticated nav | `components/layout/nav-user.tsx` | `i18n.changeLanguage` only |
| Auth pages | `components/auth/auth-layout.tsx` | `i18n.changeLanguage` only |

### Translation Files

- `src/locales/pt-BR/translation.json` — 909 keys (primary/default)
- `src/locales/en-US/translation.json` — 909 keys (exact match)
- `src/locales/zh-CN/translation.json` — 909 keys (exact match)

Key integrity check: `node -e "const pt=...,en=...,zh=...; /* compare flattened keys */"`

8 zh-CN values are intentionally identical to en-US (brand names: WhatsApp, Instagram, LinkedIn, TikTok, YouTube, X/Twitter, Facebook, Boleto) — these are correct.

### Locale-Specific Formatting

**Date display formats:**

| File | Function | zh-CN | pt-BR | en-US |
|---|---|---|---|---|
| `lib/date-mask.ts` | `DATE_MASKS` | `####/##/##` | `##/##/####` | `##/##/####` |
| `lib/date-mask.ts` | `isoToDisplay()` | YYYY/MM/DD | DD/MM/YYYY | MM/DD/YYYY |
| `lib/date-mask.ts` | `displayToIso()` | parse YYYYMMDD | parse DDMMYYYY | parse MMDDYYYY |
| `lib/billing-utils.ts` | `displayToIsoAllowFuture()` | parse YYYYMMDD | parse DDMMYYYY | parse MMDDYYYY |
| `lib/format-date.ts` | `formatDate()` | browser `Intl.DateTimeFormat("zh-CN")` | browser handles | browser handles |
| `lib/format-relative-time.ts` | `formatRelativeTime()` | browser `toLocaleDateString("zh-CN")` | browser handles | browser handles |
| `components/agents/agent-dialog.tsx` | `timestampToDateDisplay()` | YYYY/MM/DD | DD/MM/YYYY | MM/DD/YYYY |
| `components/agents/agent-dialog.tsx` | `dateDisplayToTimestamp()` | parse YYYYMMDD | parse DDMMYYYY | parse MMDDYYYY |
| `components/calendar/calendar-appointment-dialog.tsx` | `dateToDisplay()` | YYYY/MM/DD | DD/MM/YYYY | MM/DD/YYYY |

**Document masks** (`lib/document-mask.ts`): Uses `DOCUMENT_MASKS[i18n.language] ?? DOCUMENT_MASKS["en-US"]` — graceful fallback, no zh-CN change needed.

**Currency formatting** (`components/usage/usage-*-grid.tsx`): Uses `Intl.NumberFormat` with locale for number style, but `currencyCode` (BRL/USD) controls the actual currency symbol. en-US locale is acceptable for zh-CN users.

---

## Routing & SEO

### Public Routes (Prerendered as Static HTML)

| Path | Accept-Language | Description |
|---|---|---|
| `/` | pt-BR | Landing page |
| `/en` | en-US | Landing page |
| `/zh` | zh-CN | Landing page |
| `/privacy` | pt-BR | Privacy policy |
| `/en/privacy` | en-US | Privacy policy |
| `/zh/privacy` | zh-CN | Privacy policy |
| `/terms` | pt-BR | Terms of service |
| `/en/terms` | en-US | Terms of service |
| `/zh/terms` | zh-CN | Terms of service |

Configured in `vite.config.ts` → `tanstackStart({ pages: [...] })`.

### Authenticated Routes (SSR + Client)

All routes under `/_app.*` — chat, customers, services, products, collaborators, skills, agents, calendar, finance, usage. Use `_app.tsx` layout with NavDesktop, NavMobile, DynamicContentWrapper.

### SEO Metadata

**Per-route `<head>` bundles:**
- Landing: `buildLandingHead(lang)` in `components/landing/landing-route-helpers.ts`
- Legal: `buildLegalHead(getLegalRoute(type, lang))` in `components/legal/legal-route-helpers.ts`

**SEO components:**
- `components/landing/seo-utils.ts` — `LangCode` type, `MetaInput` interface, `SITE_URL`
- `lib/seo-head.ts` — `buildHead()` generates meta tags, hreflang links, JSON-LD
- `components/landing/landing-seo.ts` — `buildJsonLd()`, `buildLegalJsonLd()`, `buildFaqJsonLd()`

**hreflang alternates:**
- `lib/seo-head.ts` DEFAULT_ALTERNATES: pt-BR→`/`, en-US→`/en`, zh-CN→`/zh`, x-default→`/`
- Per-route overrides pass correct canonical URLs

**Sitemap:**
- `src/worker.ts` generates `/sitemap.xml` dynamically
- Includes all 9 locale-prefixed URLs with full hreflang alternates
- Landing: weekly/1.0 (pt-BR), weekly/0.9 (en-US, zh-CN)
- Legal pages: monthly/0.3

### JSON-LD Structured Data

- Landing: Organization + WebSite + SoftwareApplication schema
- Legal: WebPage schema with inLanguage from ogLocale
- `ogLocale.replace("_", "-")` converts `zh_CN` → `zh-CN` for JSON-LD

---

## Legal Pages Architecture

Legal pages (privacy/terms) have full per-language content, not translated at runtime.

**Structure:**
```
src/components/legal/
├── legal-app.tsx            # Top-level LegalApp component
├── legal-page.tsx           # LegalPage with Content dispatcher
├── legal-route-helpers.ts   # SEO head builder wrapper
├── legal-seo.ts             # Per-locale SEO meta for privacy/terms
├── legal-prose.tsx          # Shared prose components (H1, H2, P, UL, LI, etc.)
├── privacy/
│   ├── privacy-pt-br.tsx    # 12 sections
│   ├── privacy-en-us.tsx    # 12 sections
│   └── privacy-zh-cn.tsx    # 12 sections
└── terms/
    ├── terms-pt-br.tsx      # 16 sections
    ├── terms-en-us.tsx      # 16 sections
    └── terms-zh-cn.tsx      # 16 sections
```

**Content dispatch** in `legal-page.tsx`:
```tsx
function Content({ type, lang }) {
  if (type === "privacy") {
    if (lang === "pt-BR") return <PrivacyPtBR />;
    if (lang === "zh-CN") return <PrivacyZhCN />;
    return <PrivacyEnUS />;
  }
  if (lang === "pt-BR") return <TermsPtBR />;
  if (lang === "zh-CN") return <TermsZhCN />;
  return <TermsEnUS />;
}
```

Cross-language links: zh-CN terms link to `/zh/privacy`, en-US terms link to `/en/privacy`, etc.

---

## Convex Backend

### Key Tables (convex/schema.ts)

| Table | Purpose |
|---|---|
| `users` | Auth, onboarding, profile photo |
| `threads` / `threadStatus` | Chat threads (status split to avoid OCC contention) |
| `customers` | Customer CRM |
| `customerFiles` | Customer files (Bunny storage + RAG vector) |
| `messages` | WhatsApp/Email messages |
| `messagingConfig` | Evolution API + Resend configuration |
| `scheduledTasks` / `scheduledTaskRuns` | Scheduled tasks |
| `skills` / `userSkills` | AI skills (system + user-created) |
| `services` / `customerServices` / `serviceTransactions` | Services and billing |
| `products` / `customerProducts` / `productTransactions` | Products and sales |
| `serviceCategories` / `productCategories` | Categories |
| `collaborators` | Team members (admin/staff roles) |
| `appointments` | Calendar appointments |
| `dailyUsage` | Daily usage tracking (tokens, credits, API calls) |
| `creditBalances` / `creditTransactions` / `userPlans` | Stripe billing |

### Convex Components

Installed via `convex.config.ts`:
- `@convex-dev/agent` — AI agent threads
- `@convex-dev/rate-limiter` — Rate limiting
- `@convex-dev/rag` — RAG vector search
- `@convex-dev/stripe` — Stripe billing integration

### Convex Auth

Uses `@convex-dev/auth` with OTP/email authentication. Auth routes (`/signin`, `/signup`, `/recover`) are client-side only (`ssr: false`).

### Convex Agent Skills

Installed via `npx convex ai-files install`, tracked in `skills-lock.json`:
- `convex`, `convex-create-component`, `convex-migration-helper`, `convex-performance-audit`, `convex-quickstart`, `convex-setup-auth`

---

## Deployment

| Item | Value |
|---|---|
| **Platform** | Cloudflare Pages (project `nivo-root`) |
| **SSR** | Cloudflare Workers via `src/worker.ts` |
| **Config** | `wrangler.toml` (Pages), `wrangler-worker.toml` (Worker/SSR) |
| **Convex** | `prod:effervescent-leopard-444` → `https://effervescent-leopard-444.convex.cloud` |
| **Site** | https://vertex.app |
| **Branch** | `main` |
| **Version** | `version.json` generated during build with git hash |

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (port 5183) |
| `pnpm build` | Full build (Vite + TypeScript + prerender) |
| `pnpm lint` | ESLint |
| `pnpm preview` | Local preview via wrangler (`wrangler pages dev dist/client`) |
| `pnpm deploy` | Build + deploy to Cloudflare Pages |
| `npx convex dev` | Convex dev mode |

---

## Key Patterns & Conventions

### UI Rules
- Icons: always `size-4.5`
- **Base UI** (not Radix UI): never use `asChild` — use `render` prop for composition (e.g., `<TooltipTrigger render={<Badge />}>`)
- Never use icons in buttons that have text
- Never use skeletons — use centered spinner instead
- Never create new UIs — reuse existing components and patterns
- `Select` component requires `items` prop (Record<string, string> mapping value → label)
- Always apply absolute symmetry in layouts
- Use existing placeholder components (centered vertically and horizontally)
- Lists must use the platform's standard animation pattern

### Code Patterns
- **Zustand stores**: `create<Interface>((set) => ({...}))`, default export
- **i18n**: NUNCA hardcode text — always use `useTranslation()` / `i18n.t()`
- **Utils**: `cn()` for Tailwind class merge (clsx + tailwind-merge)
- **CSS variables**: defined in `index.css` for theming
- **Font**: Inter Variable via woff2 in `/public/fonts/`

### Cross-Request i18n Race (Known Trade-off)

In `__root.tsx` beforeLoad:
```ts
if (i18n.language !== lang) {
  void i18n.changeLanguage(lang);
}
```

On Cloudflare Workers, the i18n instance is module-scoped and shared across concurrent requests within the same isolate. Mutating it introduces a theoretical cross-request race when different-language requests interleave during async work. This is an accepted trade-off for this app's scale. The comment in `__root.tsx` acknowledges this explicitly.

### Binary Locale Pattern (Anti-pattern to Avoid)

Many date/formatting functions originally used binary `if (lang === "pt-BR") ... else ...` pattern, which breaks for zh-CN. The correct pattern is a three-way check:

```typescript
// CORRECT — three-way
if (language === "zh-CN") { ... }
else if (language === "pt-BR") { ... }
else { ... } // en-US

// WRONG — binary (zh-CN falls through to en-US incorrectly)
if (language === "pt-BR") { ... }
else { ... }
```

All locale-specific date parsing functions now use the three-way pattern.

### When to Use Native Intl vs Custom Parsing

- **Display formatting**: use browser `Intl.DateTimeFormat`, `toLocaleDateString`, `toLocaleTimeString` with `i18n.language` — all 3 locales are natively supported
- **Input parsing** (mask → ISO): custom logic per locale in `date-mask.ts`, `billing-utils.ts`, `agent-dialog.tsx`, `calendar-appointment-dialog.tsx`
- **Currency formatting**: `Intl.NumberFormat` with locale for number style, separate `currencyCode` for symbol
