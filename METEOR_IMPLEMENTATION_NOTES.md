# Integração do Componente Meteors

Como o seu projeto atual ("Site - Software") é **feito em HTML/JS/CSS puro** (sem React/Next.js instalados), eu **implementei o efeito nativamente** direto no seu arquivo `index.html` e `script.js` para que ele já funcione nos cards de "Nossa expertise" sem precisar refatorar o site inteiro.

No entanto, para cumprir as suas requisições estruturais (caso você vá integrar isso em um projeto React futuro), eu **criei os arquivos na estrutura solicitada** (`/components/ui/meteors.tsx` e `tailwind.config.js`) na raiz desse projeto e respondi as perguntas abaixo.

---

## 1. Configuração do Projeto (React / Tailwind / shadcn)

Se este fosse um projeto React vazio ou se você quiser migrar para suportar a estrutura solicitada, aqui estão as instruções:

1. **Instalar Tailwind CSS e TypeScript**:
   Em um projeto como Vite ou Next.js, rode:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
   *E certifique-se de que o projeto suporta TypeScript (`npx create-next-app@latest` por exemplo).*

2. **Setup do shadcn/ui**:
   Rode o comando de inicialização da biblioteca:
   ```bash
   npx shadcn-ui@latest init
   ```
   Isso instalará dependências utilitárias (como `clsx` e `tailwind-merge`) e criará a função `cn()` em `@/lib/utils.ts`.

3. **Caminho Padrão dos Componentes**:
   Por que `/components/ui`? 
   Ao rodar o CLI do `shadcn/ui`, ele padroniza o uso da pasta `components/ui` para todos os componentes de interface independentes que ele gera. Separar esses componentes em uma sub-pasta `ui/` mantém a arquitetura limpa e separa os "blocos de montar visual" da regra de negócios inteligente (que ficariam na raiz de `components` ou `features`).

---

## 2. Análise do Componente e Dependências

- **Dependências Externas**: Nenhuma biblioteca externa gigante é requerida, a não ser as utilidades do shadcn: `clsx` e `tailwind-merge` (que englobam a função `cn` no import `import { cn } from "@/lib/utils"`).
- **Provedores de Contexto (Hooks)**: Nenhum hook complexo é necessário. O componente é puramente funcional e visual.

## 3. Revisão de Argumentos e Estado
- `number?: number`: Argumento opcional que define a quantidade de meteoros. Se não passado, o fallback é `20`.
- `className?: string`: Permite passar estilos adicionais diretamente para o container do meteoro.
- *Estado*: Não possui variáveis de estado interno (`useState` ou `useEffect`). Ele apenas renderiza spans puros baseados em um array.

## 4. Respostas às Perguntas de Guideline

- **What data/props will be passed to this component?**
  Basicamente apenas a quantidade (`number`) de meteoros e classes opcionais (`className`). É um componente visual ("Dumb Component"), sem dados globais ou de API.
  
- **Are there any specific state management requirements?**
  Não. Não necessita de Redux, Zustand ou Context API, pois a posição de cada meteoro e o delay da animação são calculados estaticamente no momento da renderização usando `Math.random()`.

- **Are there any required assets (images, icons, etc.)?**
  Nenhuma imagem externa. Os visuais são 100%feitos com Tailwind utility classes e pseudo-elementos (`before:content-['']` e `bg-gradient-to-r`).

- **What is the expected responsive behavior?**
  Por se tratar de formas posicionadas via `absolute`, o grid ou componente "pai" deve ter as propriedades CSS responsivas principais. O meteoro em si vai simplesmente disparar linhas dentro de qualquer container parente que possua `position: relative` e `overflow: hidden`.
  
- **What is the best place to use this component in the app?**
  O ideal é aplicá-lo em seções de destaque relativas a inovação, tecnologia e velocidade — como os cards de `"Nossa expertise"`, Call-To-Actions, ou Heros escuros. Fica melhor em fundos de tom mais escuro (`bg-gray-900`, `bg-slate-800`), onde a cauda iluminada dos meteoros reflete melhor.

---
> **Nota de Implementação Nativa:** Como pedido ("Implemente o componente nos cards"), sem quebrar o seu site atual que está puro em HTML, adicionei a versão JavaScript correspondente no `script.js` (linha 577), rodando no carregamento e injetando as marcações dentro dos `.service-card`. Adicionei também a configuração do Tailwind nas linhas da tag `<script>` no seu `index.html`.
