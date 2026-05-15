leia todo conteúdo dessas urls usando bash curl:

https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/installation/vite.mdx
https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/%28root%29/theming.mdx
https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/%28root%29/cli.mdx
https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/%28root%29/dark-mode.mdx
https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/%28root%29/colors.mdx

leia todo conteúdo dessas urls usando WebFetch:

https://ui.shadcn.com/docs/components
https://base-ui.com/react/overview
https://base-ui.com/react/guides/styling
https://base-ui.com/react/guides/composition

não salve os arquivos, apenas deixe na sua janela de contexto

---

# Contexto do projeto

Este projeto usa **shadcn/ui CLI v4** com **Base UI** como camada primitiva, em vez de Radix UI.

- Estilo: `base-nova` (campo `style` no `components.json`)
- Pacote primitivo: `@base-ui/react` (não `@radix-ui/*`)
- Configuração em: `components.json`

```json
{
  "style": "base-nova",
  "tailwind": { "baseColor": "neutral", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": {
    "ui": "@/components/ui",
    "utils": "@/lib/utils",
    "hooks": "@/hooks"
  }
}
```

## Diferenças importantes: Base UI vs Radix UI

| Aspecto | Radix UI | Base UI |
|---|---|---|
| Composição | `asChild` prop | `render` prop |
| Exemplo | `<Button asChild><a /></Button>` | `<Button render={<a />} />` |
| Anatomia | `Dialog.Root`, `Dialog.Trigger`… | importado de `@base-ui/react/dialog` |
| Merging de props | manual | `mergeProps()` de `@base-ui/react/merge-props` |
| Render customizado | `Slot` | `useRender()` de `@base-ui/react/use-render` |

## Regras ao trabalhar com componentes

1. **Nunca use `@radix-ui/*`** — use sempre `@base-ui/react/<componente>`
2. **Adicione componentes via CLI**: `pnpm dlx shadcn@latest add <nome>` (o CLI já usa Base UI)
3. **Use `render` prop** para composição polimórfica, não `asChild`
4. **Importe utilitários** de `@base-ui/react/merge-props` e `@base-ui/react/use-render` quando necessário
5. **Componentes sem primitivo** (card, table, alert, skeleton, etc.) são HTML/React puro — não precisam de Base UI

## Pacotes de terceiros (não Base UI)

Alguns componentes usam libs próprias independentes:

| Componente | Pacote |
|---|---|
| chart | recharts |
| carousel | embla-carousel-react |
| resizable | react-resizable-panels v4 (`Group`, `Panel`, `Separator`) |
| drawer | vaul |
| sonner | sonner + next-themes |
| command | cmdk |
| input-otp | input-otp |
| calendar | react-day-picker |

após ler tudo, não precisa me mandar um resumo, apenas diga "Ok, li tudo e estou pronto"
