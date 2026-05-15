# Stack

Este projeto utiliza as seguintes tecnologias:

- **Shadcn/ui** (estilo `base-nova`, primitivo **Base UI** — não Radix UI) → `docs/prompts/shadcn-specialist-init.md`
- **Tailwind v4** → `docs/prompts/tailwind-specialist-init.md`
- **Convex** → `docs/prompts/convex-specialist-init.md`
- **Cloudflare** → `docs/prompts/cloudflare-specialist-init.md`
- **Vite** → `docs/prompts/vite-specialist-init.md`

# Instruções (CRÍTICO)

- Quando o usuário solicitar algo relacionado a uma dessas tecnologias, leia e execute
as instruções do arquivo de init correspondente **antes de responder**.
- Se a solicitação envolver múltiplas tecnologias, carregue todos as skills e seus arquivos que julgar relevantes.
- Sempre que for implementar algo siga:
  - O mesmo padrão de UI já utilizado em componentes semelhantes.
  - Nunca utilize texto hardcoded, avalie os arquivos de dicionários i18n e verifique se é necessário criar um item novo no dicionário ou se pode reutilizar algum já existente.
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

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
