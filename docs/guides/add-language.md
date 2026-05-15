# 添加新语言指南

本文档描述向 Vertex 平台添加新语言的完整步骤。以添加日语（`ja-JP`）为例。

## 前置信息

- **默认语言**: pt-BR（无 URL 前缀）
- **现有语言**: pt-BR、en-US、zh-CN
- **翻译键总数**: 909 个（`src/locales/pt-BR/translation.json`）
- **URL 前缀规则**: 非默认语言必须有前缀（如 `/en`, `/zh`），前缀应简短（2 字母）
- **`Lang` 类型**: `"pt-BR" | "en-US" | "zh-CN"` — 需要在多处添加新语言

---

## Step 1: 创建翻译文件

复制 `src/locales/en-US/translation.json` 到新语言目录，例如 `src/locales/ja-JP/translation.json`，翻译全部 909 个键的值。

**验证完整性**:
```bash
node -e "
const pt = require('./src/locales/pt-BR/translation.json');
const xx = require('./src/locales/ja-JP/translation.json');
function flatKeys(o, p='') {
  let k=[];
  for(const[a,v]of Object.entries(o)){const f=p?p+'.'+a:a;if(typeof v==='object'&&v!==null)k=k.concat(flatKeys(v,f));else k.push(f);}
  return k;
}
const pk=new Set(flatKeys(pt)), xk=new Set(flatKeys(xx));
const missing=[...pk].filter(k=>!xk.has(k));
const extra=[...xk].filter(k=>!pk.has(k));
console.log('Missing:', missing.length, missing);
console.log('Extra:', extra.length, extra);
console.log('OK:', pk.size===xk.size && missing.length===0 && extra.length===0);
"
```

> 确保 JSON 解析正常：翻译文本中不要使用 `"` 替代引号，应使用 `「」` 或 `""`。

---

## Step 2: 核心 i18n 配置（2 个文件）

### 2.1 `src/i18n/locale-routing.ts`

```typescript
// 1. Lang 类型
export type Lang = "pt-BR" | "en-US" | "zh-CN" | "ja-JP";

// 2. PREFIX_TO_LANG
const PREFIX_TO_LANG: Record<string, Lang> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",        // ← 新增
};

// 3. LANG_TO_PREFIX
const LANG_TO_PREFIX: Record<Lang, string | null> = {
  "en-US": "en",
  "zh-CN": "zh",
  "ja-JP": "ja",      // ← 新增
  "pt-BR": null,
};

// 4. client 函数 — cookie 验证 + navigator.language 检测
.client((): Lang => {
  if (typeof document === "undefined") return "pt-BR";
  const match = document.cookie.match(/nivo-lang=([^;]+)/);
  if (match?.[1] === "en-US" || match?.[1] === "pt-BR" || match?.[1] === "zh-CN" || match?.[1] === "ja-JP") return match[1];  // ← 添加 ja-JP
  if (typeof navigator !== "undefined") {
    const navLang = navigator.language ?? "";
    if (/^ja/i.test(navLang)) return "ja-JP";    // ← 新增，放在 en 检查之前
    if (/^zh/i.test(navLang)) return "zh-CN";
    if (/^en/i.test(navLang)) return "en-US";
  }
  return "pt-BR";
})

// 5. server 函数 — cookie 验证 + Accept-Language 头检测
.server((): Lang => {
  const cookie = getCookie("nivo-lang");
  if (cookie === "en-US" || cookie === "pt-BR" || cookie === "zh-CN" || cookie === "ja-JP") return cookie;  // ← 添加 ja-JP
  const accept = getRequestHeader("accept-language") ?? "";
  const trimmed = accept.trim();
  if (/^ja(-|_|,|;|$)/i.test(trimmed)) return "ja-JP";    // ← 新增，放在 en 检查之前
  if (/^zh(-|_|,|;|$)/i.test(trimmed)) return "zh-CN";
  if (/^en(-|_|,|;|$)/i.test(trimmed)) return "en-US";
  return "pt-BR";
})
```

### 2.2 `src/i18n/config.ts`

```typescript
// 1. 导入翻译文件
import jaJP from "@/locales/ja-JP/translation.json";

// 2. 注册资源
const resources = {
  "en-US": { translation: enUS },
  "pt-BR": { translation: ptBR },
  "zh-CN": { translation: zhCN },
  "ja-JP": { translation: jaJP },    // ← 新增
};

// 3. Lang 类型
type Lang = "pt-BR" | "en-US" | "zh-CN" | "ja-JP";

// 4. getInitialLang — URL 路径检测
if (path === "/en" || path.startsWith("/en/")) return "en-US";
if (path === "/zh" || path.startsWith("/zh/")) return "zh-CN";
if (path === "/ja" || path.startsWith("/ja/")) return "ja-JP";    // ← 新增

// 5. cookie 匹配
if (match?.[1] === "en-US" || match?.[1] === "zh-CN" || match?.[1] === "ja-JP") return match[1];  // ← 添加 ja-JP
```

---

## Step 3: 路由与 SEO（4 个文件）

### 3.1 `vite.config.ts`

在 `tanstackStart({ pages: [...] })` 中添加 3 个预渲染页面：

```typescript
pages: [
  { path: "/", prerender: { headers: { "Accept-Language": "pt-BR" } } },
  { path: "/en", prerender: { headers: { "Accept-Language": "en-US" } } },
  { path: "/zh", prerender: { headers: { "Accept-Language": "zh-CN" } } },
  { path: "/ja", prerender: { headers: { "Accept-Language": "ja-JP" } } },       // ← 新增
  { path: "/privacy", prerender: { headers: { "Accept-Language": "pt-BR" } } },
  { path: "/terms", prerender: { headers: { "Accept-Language": "pt-BR" } } },
  { path: "/en/privacy", prerender: { headers: { "Accept-Language": "en-US" } } },
  { path: "/en/terms", prerender: { headers: { "Accept-Language": "en-US" } } },
  { path: "/zh/privacy", prerender: { headers: { "Accept-Language": "zh-CN" } } },
  { path: "/zh/terms", prerender: { headers: { "Accept-Language": "zh-CN" } } },
  { path: "/ja/privacy", prerender: { headers: { "Accept-Language": "ja-JP" } } }, // ← 新增
  { path: "/ja/terms", prerender: { headers: { "Accept-Language": "ja-JP" } } },   // ← 新增
],
```

### 3.2 `src/worker.ts`

在 sitemap.xml 生成器中为每个 alternate 列表和 URL 条目添加新语言：

```typescript
// 每个 ALTS 数组都添加
const LANDING_ALTS = [
  { hreflang: "pt-BR", href: `${siteUrl}/` },
  { hreflang: "en-US", href: `${siteUrl}/en` },
  { hreflang: "zh-CN", href: `${siteUrl}/zh` },
  { hreflang: "ja-JP", href: `${siteUrl}/ja` },    // ← 新增
  { hreflang: "x-default", href: `${siteUrl}/` },
];
// PRIVACY_ALTS 和 TERMS_ALTS 同理

// 添加 URL 条目
entries.push(urlEntry(`${siteUrl}/ja`, "weekly", "0.9", LANDING_ALTS));          // ← 新增
entries.push(urlEntry(`${siteUrl}/ja/privacy`, "monthly", "0.3", PRIVACY_ALTS)); // ← 新增
entries.push(urlEntry(`${siteUrl}/ja/terms`, "monthly", "0.3", TERMS_ALTS));     // ← 新增
```

### 3.3 `src/components/landing/seo-utils.ts`

```typescript
// LangCode 类型
export type LangCode = "pt-BR" | "en-US" | "zh-CN" | "ja-JP";

// MetaInput alternates 接口
export interface MetaInput {
  alternates?: {
    "pt-BR": string;
    "en-US": string;
    "zh-CN": string;
    "ja-JP": string;    // ← 新增
    "x-default": string;
  };
  // ...
}
```

### 3.4 `src/lib/seo-head.ts`

```typescript
// DEFAULT_ALTERNATES
const DEFAULT_ALTERNATES = {
  "pt-BR": `${SITE_URL}/pt`,
  "en-US": `${SITE_URL}/en`,
  "zh-CN": `${SITE_URL}/zh`,
  "ja-JP": `${SITE_URL}/ja`,    // ← 新增
  "x-default": `${SITE_URL}/`,
} as const;

// buildHead 中的 hreflang links
const links: HeadLink[] = [
  // ...canonical...
  { rel: "alternate", hrefLang: "pt-BR", href: alternates["pt-BR"] },
  { rel: "alternate", hrefLang: "en-US", href: alternates["en-US"] },
  { rel: "alternate", hrefLang: "zh-CN", href: alternates["zh-CN"] },
  { rel: "alternate", hrefLang: "ja-JP", href: alternates["ja-JP"] },    // ← 新增
  { rel: "alternate", hrefLang: "x-default", href: alternates["x-default"] },
];
```

### 3.5 `src/components/landing/landing-route-helpers.ts`

```typescript
// TITLES Record
const TITLES: Record<LandingLang, { title: string; description: string; keywords: string; ogAlt: string }> = {
  // ... pt-BR, en-US, zh-CN ...
  "ja-JP": {    // ← 新增
    title: "Vertex — 知能アシスタントでビジネスを効率管理",
    description: "顧客、サービス、製品、カレンダー、財務、チームを一元管理するAIプラットフォーム。",
    keywords: "Vertex, 管理, AI, 顧客, カレンダー, 財務, プラットフォーム",
    ogAlt: "Vertex — 知能ビジネスアシスタント",
  },
};

// buildLandingHead 函数中
const ogLocale = lang === "en-US" ? "en_US" : lang === "zh-CN" ? "zh_CN" : lang === "ja-JP" ? "ja_JP" : "pt_BR";  // ← 添加 ja-JP

alternates: {
  "pt-BR": `${SITE_URL}/`,
  "en-US": `${SITE_URL}/en`,
  "zh-CN": `${SITE_URL}/zh`,
  "ja-JP": `${SITE_URL}/ja`,    // ← 新增
  "x-default": `${SITE_URL}/`,
},
```

---

## Step 4: Legal 页面 SEO（1 个文件）

### 4.1 `src/components/legal/legal-seo.ts`

```typescript
// LegalRouteMeta alternates 接口
export interface LegalRouteMeta {
  // ...
  alternates: {
    "pt-BR": string;
    "en-US": string;
    "zh-CN": string;
    "ja-JP": string;    // ← 新增
    "x-default": string;
  };
}

// META Record — 为 privacy 和 terms 各添加一个条目
const META: Record<LegalPageType, Record<LandingLang, { ... }>> = {
  privacy: {
    // ... pt-BR, en-US, zh-CN ...
    "ja-JP": {    // ← 新增
      title: "プライバシーポリシー — Vertex",
      description: "Vertex による個人情報とビジネスデータの収集・使用・共有・保護。権利、保有期間、セキュリティ、お問い合わせ。",
      ogAlt: "Vertex プライバシーポリシー",
      keywords: "プライバシー, データ保護, 個人情報, プライバシーポリシー, Vertex",
    },
  },
  terms: {
    // ... pt-BR, en-US, zh-CN ...
    "ja-JP": {    // ← 新增
      title: "利用規約 — Vertex",
      description: "Vertex プラットフォームの利用規約。プラン、クレジット課金、適正利用、知的財産権、責任制限。",
      ogAlt: "Vertex 利用規約",
      keywords: "利用規約, 利用条件, 契約, プラン, サブスクリプション, Vertex",
    },
  },
};

// buildLegalMeta 函数中
const ogLocale = lang === "en-US" ? "en_US" : lang === "zh-CN" ? "zh_CN" : lang === "ja-JP" ? "ja_JP" : "pt_BR";  // ← 添加 ja-JP

const jaCanonical = `${SITE_URL}/ja/${segment}`;  // ← 新增

return {
  // ...
  alternates: {
    "pt-BR": ptCanonical,
    "en-US": enCanonical,
    "zh-CN": zhCanonical,
    "ja-JP": jaCanonical,    // ← 新增
    "x-default": ptCanonical,
  },
};
```

---

## Step 5: 语言切换器（3 个文件）

### 5.1 `src/components/layout/nav-user.tsx` （应用内）

```typescript
const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English",
  "pt-BR": "Português",
  "zh-CN": "简体中文",
  "ja-JP": "日本語",    // ← 新增
};

// 在 DropdownMenuRadioGroup 中添加
<DropdownMenuRadioItem value="ja-JP">
  {LANGUAGE_LABELS["ja-JP"]}
</DropdownMenuRadioItem>
```

### 5.2 `src/components/landing/landing-footer.tsx` （Landing 页脚）

```typescript
const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English",
  "pt-BR": "Português",
  "zh-CN": "简体中文",
  "ja-JP": "日本語",    // ← 新增
};

// 接口类型
interface LandingFooterProps {
  currentLang: "pt-BR" | "en-US" | "zh-CN" | "ja-JP";
  onSwitchLanguage: (lang: "pt-BR" | "en-US" | "zh-CN" | "ja-JP") => void;
}

// onValueChange cast
onValueChange={(value) =>
  onSwitchLanguage(value as "pt-BR" | "en-US" | "zh-CN" | "ja-JP")    // ← 添加
}

// DropdownMenuRadioItem
<DropdownMenuRadioItem value="ja-JP">
  {LANGUAGE_LABELS["ja-JP"]}
</DropdownMenuRadioItem>
```

### 5.3 `src/components/auth/auth-layout.tsx` （认证页）

```typescript
const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English",
  "pt-BR": "Português",
  "zh-CN": "简体中文",
  "ja-JP": "日本語",    // ← 新增
};

// DropdownMenuRadioItem
<DropdownMenuRadioItem value="ja-JP">
  {LANGUAGE_LABELS["ja-JP"]}
</DropdownMenuRadioItem>
```

---

## Step 6: Lang 类型声明（4 个文件）

以下文件的本地 `type Lang` 需要添加新语言：

| 文件 | 修改内容 |
|---|---|
| `src/components/landing/landing-app.tsx` | `type Lang = "pt-BR" \| "en-US" \| "zh-CN" \| "ja-JP";` |
| `src/components/landing/landing-page.tsx` | 同上 |
| `src/components/legal/legal-app.tsx` | 同上 |
| `src/components/legal/legal-page.tsx` | 同上 |

---

## Step 7: Legal 页面内容（2 个新文件 + 1 个文件修改）

### 7.1 创建 `src/components/legal/privacy/privacy-ja-jp.tsx`

参照 `privacy-en-us.tsx` 或 `privacy-zh-cn.tsx` 的结构（12 节），使用 `legal-prose.tsx` 的组件：

```tsx
import { A, H1, H2, LI, Lead, P, Strong, UL, UpdatedAt } from "../legal-prose";

export function PrivacyJaJP() {
  return (
    <>
      <H1>プライバシーポリシー</H1>
      <UpdatedAt>最終更新：2026年4月13日</UpdatedAt>
      <Lead>...</Lead>
      {/* 12 sections matching en-US structure */}
      <H2 id="data">1. 収集するデータ</H2>
      {/* ... */}
    </>
  );
}
```

### 7.2 创建 `src/components/legal/terms/terms-ja-jp.tsx`

参照 `terms-en-us.tsx` 或 `terms-zh-cn.tsx` 的结构（16 节）。

### 7.3 修改 `src/components/legal/legal-page.tsx`

```typescript
// 添加导入
import { PrivacyJaJP } from "./privacy/privacy-ja-jp";
import { TermsJaJP } from "./terms/terms-ja-jp";

// 更新 Lang 类型
type Lang = "pt-BR" | "en-US" | "zh-CN" | "ja-JP";

// 更新 Content 函数 — 添加新语言分支
function Content({ type, lang }: { type: LegalPageType; lang: Lang }) {
  if (type === "privacy") {
    if (lang === "pt-BR") return <PrivacyPtBR />;
    if (lang === "zh-CN") return <PrivacyZhCN />;
    if (lang === "ja-JP") return <PrivacyJaJP />;    // ← 新增
    return <PrivacyEnUS />;
  }
  if (lang === "pt-BR") return <TermsPtBR />;
  if (lang === "zh-CN") return <TermsZhCN />;
  if (lang === "ja-JP") return <TermsJaJP />;    // ← 新增
  return <TermsEnUS />;
}
```

> 新语言的 terms 文件内如果有链接到 privacy 页面，使用对应语言的前缀（如 `href="/ja/privacy"`）。

---

## Step 8: 日期格式化（必须检查 5 个文件）

新语言的日期格式可能与 pt-BR（DD/MM/YYYY）或 en-US（MM/DD/YYYY）不同。**每一个包含 locale-specific 日期逻辑的文件都必须检查。**

### 8.1 `src/lib/date-mask.ts`

```typescript
// DATE_MASKS — 添加新语言条目
export const DATE_MASKS: Record<string, { mask: string; placeholder: string }> = {
  "pt-BR": { mask: "##/##/####", placeholder: "DD/MM/AAAA" },
  "en-US": { mask: "##/##/####", placeholder: "MM/DD/YYYY" },
  "zh-CN": { mask: "####/##/##", placeholder: "YYYY/MM/DD" },
  "ja-JP": { mask: "####/##/##", placeholder: "YYYY/MM/DD" },    // ← 新增（日语也是年月日）
};

// isoToDisplay — 添加新语言分支（放在 pt-BR 检查之前）
export function isoToDisplay(iso: string, language: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (language === "zh-CN") return `${year}/${month}/${day}`;
  if (language === "ja-JP") return `${year}/${month}/${day}`;    // ← 新增
  if (language === "pt-BR") return `${day}/${month}/${year}`;
  return `${month}/${day}/${year}`;
}

// displayToIso — 添加新语言解析分支
export function displayToIso(display: string, language: string): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  let day: number, month: number, year: number;
  if (language === "zh-CN" || language === "ja-JP") {           // ← 可合并相同格式的语言
    year = parseInt(digits.slice(0, 4), 10);
    month = parseInt(digits.slice(4, 6), 10);
    day = parseInt(digits.slice(6, 8), 10);
  } else if (language === "pt-BR") {
    day = parseInt(digits.slice(0, 2), 10);
    month = parseInt(digits.slice(2, 4), 10);
    year = parseInt(digits.slice(4, 8), 10);
  } else {
    month = parseInt(digits.slice(0, 2), 10);
    day = parseInt(digits.slice(2, 4), 10);
    year = parseInt(digits.slice(4, 8), 10);
  }
  // ... 验证逻辑不变 ...
}
```

### 8.2 `src/lib/billing-utils.ts`

`displayToIsoAllowFuture()` — 同上修改（允许未来日期，year 上限 2100）。

### 8.3 `src/components/agents/agent-dialog.tsx`

`timestampToDateDisplay()` 和 `dateDisplayToTimestamp()` — 同上修改。

### 8.4 `src/components/calendar/calendar-appointment-dialog.tsx`

`dateToDisplay()` — 同上修改。

> 以下文件使用浏览器原生 `Intl.DateTimeFormat`，**无需修改**：
> - `src/lib/format-date.ts`
> - `src/lib/format-relative-time.ts`
> - `src/lib/document-mask.ts`（使用 `??` 优雅降级）
> - `src/components/usage/usage-*-grid.tsx`（货币数字格式化，en-US 对新语言可接受）

---

## 修改文件清单速查

按依赖顺序，共需修改 **15 个文件** + 新建 **3 个文件**：

| # | 操作 | 文件 | 修改内容 |
|---|---|---|---|
| 1 | 新建 | `src/locales/{lang}/translation.json` | 翻译 909 键 |
| 2 | 新建 | `src/components/legal/privacy/privacy-{lang}.tsx` | 隐私政策（12 节） |
| 3 | 新建 | `src/components/legal/terms/terms-{lang}.tsx` | 服务条款（16 节） |
| 4 | 修改 | `src/i18n/locale-routing.ts` | Lang 类型、PREFIX、cookie 验证、Accept-Language 检测 |
| 5 | 修改 | `src/i18n/config.ts` | 导入、resources、Lang 类型、URL/cookie 检测 |
| 6 | 修改 | `vite.config.ts` | 3 个预渲染页面 |
| 7 | 修改 | `src/worker.ts` | sitemap hreflang alternates + URL 条目 |
| 8 | 修改 | `src/components/landing/seo-utils.ts` | LangCode 类型、alternates 接口 |
| 9 | 修改 | `src/lib/seo-head.ts` | DEFAULT_ALTERNATES、hreflang links |
| 10 | 修改 | `src/components/landing/landing-route-helpers.ts` | TITLES、ogLocale、alternates |
| 11 | 修改 | `src/components/legal/legal-seo.ts` | META、ogLocale、canonical |
| 12 | 修改 | `src/components/landing/landing-app.tsx` | Lang 类型 |
| 13 | 修改 | `src/components/landing/landing-page.tsx` | Lang 类型 |
| 14 | 修改 | `src/components/legal/legal-app.tsx` | Lang 类型 |
| 15 | 修改 | `src/components/legal/legal-page.tsx` | 导入 + Content 分发 + Lang 类型 |
| 16 | 修改 | `src/components/layout/nav-user.tsx` | LANGUAGE_LABELS + 菜单项 |
| 17 | 修改 | `src/components/landing/landing-footer.tsx` | LANGUAGE_LABELS + 接口类型 + 菜单项 |
| 18 | 修改 | `src/components/auth/auth-layout.tsx` | LANGUAGE_LABELS + 菜单项 |
| 19 | 修改 | `src/lib/date-mask.ts` | DATE_MASKS + isoToDisplay + displayToIso |
| 20 | 修改 | `src/lib/billing-utils.ts` | displayToIsoAllowFuture |
| 21 | 修改 | `src/components/agents/agent-dialog.tsx` | timestampToDateDisplay + dateDisplayToTimestamp |
| 22 | 修改 | `src/components/calendar/calendar-appointment-dialog.tsx` | dateToDisplay |

---

## 验证清单

完成所有修改后，逐项验证：

```bash
# 1. 翻译键完整性（零 missing、零 extra）
# 使用 Step 1 的 node 命令验证

# 2. JSON 解析正常
node -e "JSON.parse(require('fs').readFileSync('./src/locales/{lang}/translation.json', 'utf-8')); console.log('OK')"

# 3. TypeScript 编译通过
npx tsc --noEmit

# 4. Lint 无新增错误
pnpm lint

# 5. 搜索残留的二元 locale 模式
# 不应出现只有 pt-BR 和 else 的日期逻辑
grep -rn 'language === "pt-BR".*else' src/ --include='*.ts' --include='*.tsx'

# 6. 搜索所有 Lang 类型定义，确保都包含新语言
grep -rn 'type Lang\s*=' src/ --include='*.ts' --include='*.tsx'

# 7. 搜索所有 LANGUAGE_LABELS，确保都包含新语言
grep -rn 'LANGUAGE_LABELS' src/ --include='*.ts' --include='*.tsx'
```

---

## 常见陷阱

### 1. 二元 locale 反模式

最易遗漏的 bug。日期解析函数如果只用 `if (pt-BR) ... else ...` 模式，新语言会错误地走 en-US 分支。

```typescript
// ❌ 错误 — 新语言会走 else → MM/DD/YYYY
if (language === "pt-BR") { ... }
else { ... }

// ✅ 正确 — 三元检查
if (language === "zh-CN" || language === "ja-JP") { ... }  // YYYY/MM/DD
else if (language === "pt-BR") { ... }                      // DD/MM/YYYY
else { ... }                                                 // MM/DD/YYYY
```

必须检查的 5 个文件：`date-mask.ts`、`billing-utils.ts`、`agent-dialog.tsx`、`calendar-appointment-dialog.tsx` 的日期显示 + 日期解析函数。

### 2. 忘记 legal-app.tsx

`legal-app.tsx` 和 `landing-app.tsx` 都有独立的 `type Lang` 定义，只改一个会漏掉另一个。

### 3. 翻译 JSON 中的引号冲突

翻译文本中如果使用 `"` 字符，会破坏 JSON 结构。应使用 `「」` 或 `""` 替代。

### 4. cookie 验证不完整

`locale-routing.ts` 的 client 和 server 函数、`config.ts` 的 `getInitialLang()` 都有 cookie 匹配逻辑。三处都必须添加新语言，否则用户切换语言后刷新会回退到 pt-BR。

### 5. prerender 页面遗漏

`vite.config.ts` 需要为 landing、privacy、terms 各添加一个页面。少加一个会导致该页面 SSR 时使用错误的语言。

### 6. Accept-Language 检测顺序

正则检测必须按**最具体→最通用**的顺序。`/^zh/` 必须在 `/^en/` 之前，`/^ja/` 必须在 `/^en/` 之前。`/^en/` 永远是最后一个检查。

---

## 无需修改的文件

以下文件使用浏览器原生 Intl API 或优雅降级，**新语言自动支持**：

| 文件 | 原因 |
|---|---|
| `src/lib/format-date.ts` | `Intl.DateTimeFormat(locale)` 原生支持所有 BCP 47 locale |
| `src/lib/format-relative-time.ts` | `toLocaleDateString(locale)` 原生支持 |
| `src/lib/document-mask.ts` | `DOCUMENT_MASKS[lang] ?? DOCUMENT_MASKS["en-US"]` 优雅降级 |
| `src/i18n/types.ts` | `typeof enUS` 类型约束，新语言 JSON 结构相同即通过 |
| `src/components/landing/landing-*.tsx` | 全部使用 `useTranslation()`，无硬编码 |
| `src/routes/*.tsx` | 从 `__root.tsx` 的 `context.lang` 获取语言，无需修改 |
| `src/router.tsx` | rewrite 使用 `locale-routing.ts` 的函数，改 prefix map 即生效 |
| `src/components/usage/usage-*-grid.tsx` | `Intl.NumberFormat` 控制数字样式，币种由 currencyCode 独立控制 |
