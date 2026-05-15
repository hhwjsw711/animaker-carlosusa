# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Stack

Este projeto utiliza as seguintes tecnologias:

- **Shadcn/ui** (estilo `base-nova`, primitivo **Base UI** — não Radix UI) → `docs/prompts/shadcn-specialist-init.md`
- **Tailwind v4** → `docs/prompts/tailwind-specialist-init.md`
- **Convex** → `docs/prompts/convex-specialist-init.md`
- **Cloudflare** → `docs/prompts/cloudflare-specialist-init.md`
- **Vite** → `docs/prompts/vite-specialist-init.md`

# Comandos

| Comando | Descrição |
|---|---|
| `pnpm dev` | Iniciar servidor de desenvolvimento (porta 5183) |
| `pnpm build` | Build completo (Vite + TypeScript + build-pages.js) |
| `pnpm lint` | Rodar ESLint |
| `pnpm preview` | Preview local com wrangler (`wrangler pages dev dist/client`) |
| `pnpm deploy` | Build + deploy no Cloudflare Pages (`nivo-root`, branch `main`) |
| `npx convex dev` | Iniciar Convex em modo desenvolvimento |
| `npx convex ai-files install` | Instalar Convex agent skills |
| `pnpm dlx shadcn@latest add <nome>` | Adicionar componente shadcn (usa Base UI) |

# Instruções (CRÍTICO)

- Quando o usuário solicitar algo relacionado a uma dessas tecnologias, leia e execute as instruções do arquivo de init correspondente **antes de responder**.
- Se a solicitação envolver múltiplas tecnologias, carregue todos as skills e seus arquivos que julgar relevantes.
- Sempre que for implementar algo siga:
  - O mesmo padrão de UI já utilizado em componentes semelhantes.
  - Nunca utilize texto hardcoded, avalie os arquivos de dicionários i18n e verifique se é necessário criar um item novo no dicionário ou pode reutilizar algum já existente.
- No final de cada implementação verifique toda a implementação em busca de bugs, tipagens, constantes, funções ou arquivos que não estão sendo mais utilizados, possíveis falhas de segurança, problemas de performance ou otimização.
- icones sempre devem ter o tamanho "size-4.5"
- Este projeto usa **Base UI** (não Radix UI). Nunca use `asChild` — use a prop `render` para composição de componentes (ex: `<TooltipTrigger render={<Badge />}>`).
- NUNCA utilize icones em botoes que tenham texto
- NUNCA utilize skeletons, prefira por spinner centralizado no centro do componente/página
- NUNCA crie UIs, reaproveite os componentes que já temos, nos padroes que já utilizamos e definimos
- O componente `Select` (Base UI) exige a prop `items` (Record<string, string> com mapa value → label) para exibir o texto correto no trigger. SEMPRE passe `items` ao usar `<Select>`.
- SEMPRE aplique simetria absoluta ao projetar e implementar layouts e componentes de UI
- Sempre reutilize ao máximo os componentes já criados ex: placeholder (sempre centralizados vertical e horizontalmente)
- Preze sempre pela performance, organização, clean code, estrutura de pastas e arquivos seguindo os padrões da plataforma.
- Sempre que for incluir uma lista certifique-se de utilizar a animação seguindo os mesmos padrões da plataforma.

# Comportamento
- Não quero parcialidade
- Quero opiniões críticas
- Não quero empatia

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Arquitetura

## Frontend: TanStack Start + React 19 + Cloudflare Pages (SSR)

- **Router**: TanStack Router com file-based routing (`src/routes/`)
- **SSR**: TanStack Start com Cloudflare Workers (`src/worker.ts`)
- **State**: Zustand stores (`src/stores/`)
- **Data fetching**: TanStack React Query + Convex Query Client (`@convex-dev/react-query`)
- **Auth**: Convex Auth (`@convex-dev/auth`)
- **i18n**: i18next + react-i18next (pt-BR padrão, en-US via prefixo `/en`)
- **Estilização**: Tailwind v4 + shadcn/ui (Base UI, estilo `base-nova`)

### Estrutura do `src/`

```
src/
├── components/          # Componentes organizados por feature
│   ├── ui/              # shadcn/ui primitives (Base UI)
│   │   └── custom/      # Componentes custom (spinner, logo, animated-list, etc.)
│   ├── layout/          # Layout do app (nav-desktop, nav-mobile, dynamic-content-wrapper)
│   ├── chat/            # Chat com AI (inclui tool-call components)
│   ├── customers/       # CRM de clientes
│   ├── services/        # Serviços
│   ├── products/        # Produtos
│   ├── collaborators/   # Colaboradores
│   ├── calendar/        # Calendário/appointments
│   ├── finance/         # Financeiro
│   ├── skills/          # Skills de AI
│   ├── onboarding/      # Onboarding flow
│   ├── profile/         # Perfil do usuário
│   ├── landing/         # Landing page pública
│   ├── legal/           # Privacy & Terms
│   └── auth/            # Auth components
├── hooks/               # Custom hooks
├── i18n/                # Configuração i18n (config.ts, locale-routing.ts, types.ts)
├── lib/                 # Utilitários (utils.ts, constants.ts, formatters, etc.)
├── locales/             # Traduções JSON (pt-BR, en-US)
├── routes/              # Rotas TanStack (file-based)
├── stores/              # Zustand stores (navigation, preferences, billing-dialog, customer-selection)
├── types/               # Tipagens TypeScript
├── router.tsx           # Configuração do router
├── worker.ts            # Cloudflare Worker entry (SSR + sitemap.xml)
└── index.css            # Tailwind + theme CSS variables
```

### Rotas

- **Públicas**: `/`, `/en`, `/privacy`, `/terms`, `/signin`, `/signup`, `/recover` (prerendered estático)
- **Autenticadas**: `/_app.*` — chat, customers, services, products, collaborators, skills, agents, calendar, finance, usage
- As rotas autenticadas usam layout `_app.tsx` com `NavDesktop`, `NavMobile`, `DynamicContentWrapper`

### i18n

- **Locales**: `pt-BR` (padrão, sem prefixo) e `en-US` (prefixo `/en`)
- **Arquivos**: `src/locales/pt-BR/translation.json` e `src/locales/en-US/translation.json` (1086 linhas cada)
- **Cookie**: `nivo-lang` armazena preferência do usuário
- **Router rewrite**: `deLocalizeUrl` remove prefixo para matching; `localizeUrl` adiciona prefixo para output
- **Uso**: `useTranslation()` do `react-i18next` — NUNCA hardcode texto

### Convex Components (via `convex.config.ts`)

- `@convex-dev/agent` — AI agent threads
- `@convex-dev/rate-limiter` — Rate limiting
- `@convex-dev/rag` — RAG vector search
- `@convex-dev/stripe` — Stripe billing integration

### Schema (convex/schema.ts)

Tabelas principais:
- `users` — Usuários com auth, onboarding, photo
- `threads` / `threadStatus` — Chat threads (status separado para evitar OCC contention)
- `customers` — CRM clientes
- `customerFiles` — Arquivos de clientes (Bunny storage + RAG)
- `messages` — Mensagens WhatsApp/Email
- `messagingConfig` — Configuração Evolution API + Resend
- `scheduledTasks` / `scheduledTaskRuns` — Tarefas agendadas
- `skills` / `userSkills` — AI skills (system + user)
- `services` / `customerServices` / `serviceTransactions` — Serviços e cobrança
- `products` / `customerProducts` / `productTransactions` — Produtos e vendas
- `serviceCategories` / `productCategories` — Categorias
- `collaborators` — Colaboradores (admin/staff)
- `appointments` — Agendamentos
- `dailyUsage` — Uso diário (tokens, credits, API calls)
- `creditBalances` / `creditTransactions` / `userPlans` — Billing (Stripe)

### Deploy

- **Plataforma**: Cloudflare Pages (projeto `nivo-root`)
- **SSR**: Cloudflare Workers via `src/worker.ts`
- **Config**: `wrangler.toml` (Pages) e `wrangler-worker.toml` (Worker/SSR)
- **Convex**: `prod:effervescent-leopard-444` → `https://effervescent-leopard-444.convex.cloud`
- **Site**: `https://vertex.app`
- **Versionamento**: `version.json` gerado no build com git hash

### Padrões de Código

- **Zustand stores**: padrão `create<Interface>((set) => ({...}))`, export default
- **i18n types**: módulo augmentation em `src/i18n/types.ts` com `typeof enUS`
- **Utils**: `cn()` para merge Tailwind classes (clsx + tailwind-merge)
- **Formatters**: `format-currency.ts`, `format-date.ts`, `format-initials.ts`, `format-relative-time.ts`
- **Constants**: `src/lib/constants.ts` (streaming timeouts, UI constants)
- **Staff access**: `STAFF_PAGES` em `src/lib/staff-pages.ts` define quais páginas staff pode acessar
- **Lucide icons**: sempre `size-4.5`, stroke-width 1.5 (definido no CSS)
- **Font**: Inter Variable (woff2 em `/public/fonts/`)

### Convex Agent Skills (`.agents/skills/`)

Skills instaladas via `skills-lock.json`:
- `convex` — Guidelines gerais
- `convex-create-component` — Criar componentes Convex
- `convex-migration-helper` — Migrações de schema/dados
- `convex-performance-audit` — Auditoria de performance
- `convex-quickstart` — Setup inicial
- `convex-setup-auth` — Setup de auth

### Prerender (SEO)

Páginas estáticas prerendered no build:
- `/`, `/en` (landing)
- `/privacy`, `/en/privacy`
- `/terms`, `/en/terms`

O worker em `src/worker.ts` também gera `/sitemap.xml` com hreflang alternates.
