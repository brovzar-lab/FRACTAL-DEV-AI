# Frontend & Design Architecture

## Component Architecture Principles

**Composition over inheritance.** Build small, focused components that compose into complex UIs. A component should do one thing well.

**Component hierarchy:**
- **Primitives** — Button, Input, Text, Icon. Styled, accessible, no business logic.
- **Composites** — SearchBar (Input + Button + Icon). Combines primitives with layout logic.
- **Features** — UserProfile (composites + data fetching + state). Domain-specific.
- **Pages/Screens** — Compose features into full views. Handle routing, layout, data orchestration.

**File organization pattern:**
```
components/
  ui/              # Primitives — Button, Input, Modal, Toast
  features/        # Feature components — UserCard, ProjectList
  layouts/         # Layout shells — DashboardLayout, AuthLayout
hooks/             # Custom hooks — useDebounce, useMediaQuery
lib/               # Utilities — formatDate, cn(), api client
```

**Naming:** PascalCase for components, camelCase for hooks/utils, kebab-case for files (or match existing project convention).

## React Patterns

**Prefer:**
- Server components for data fetching (Next.js App Router)
- Custom hooks for reusable stateful logic
- Controlled components for forms
- `useCallback`/`useMemo` only when measured performance warrants it (not preemptively)
- Composition via children/render props over prop drilling
- Colocate state as close to where it's used as possible

**Avoid:**
- `useEffect` for derived state (compute during render instead)
- Prop drilling beyond 2 levels (use context or composition)
- Giant monolithic components (split at 150-200 lines)
- Business logic in components (extract to hooks or utils)
- Index files that just re-export (adds indirection without value)

**State management decision:**
- Local UI state → `useState`
- Shared UI state (theme, sidebar) → Context or Zustand
- Server/async state → TanStack Query (React Query) or SWR
- Complex form state → React Hook Form or Formik
- Global app state → Zustand (simple) or Redux Toolkit (complex)

## Tailwind Mastery

**Responsive design:** Mobile-first. Default styles = mobile. `sm:`, `md:`, `lg:`, `xl:` for breakpoints up.
```
className="px-4 py-2 md:px-6 md:py-3 lg:px-8"
```

**Design system tokens:** Use `tailwind.config` to define project-specific colors, spacing, typography. Reference tokens, not raw values.

**Component variants pattern (with class-variance-authority or cn helper):**
```tsx
const buttonVariants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
}
```

**Dark mode:** Use `dark:` variant. Define both light and dark tokens in config. Test both modes for contrast compliance.

**Avoid:** Inline style objects when Tailwind covers it. `@apply` in most cases (defeats the purpose). Arbitrary values `[23px]` when a scale value exists.

## Accessibility (WCAG 2.1 AA)

**Non-negotiable checklist per component:**
- [ ] Keyboard navigable (Tab, Enter, Escape, Arrow keys where appropriate)
- [ ] Focus visible (never `outline-none` without replacement focus style)
- [ ] Color contrast 4.5:1 for text, 3:1 for large text and UI elements
- [ ] Alt text on images (decorative images get `alt=""`)
- [ ] Form inputs have associated labels (not just placeholder)
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Interactive elements are `button` or `a`, not `div` with `onClick`
- [ ] Modal focus trapping (focus stays inside modal, returns on close)
- [ ] Live regions (`aria-live`) for dynamic content updates
- [ ] Skip-to-content link for keyboard users
- [ ] `prefers-reduced-motion` respected for animations

**Semantic HTML first.** Use `nav`, `main`, `aside`, `section`, `article`, `header`, `footer`. ARIA is a supplement, not a replacement for correct HTML.

**Testing:** Use axe-core (via `@axe-core/react` or browser extension). Test with VoiceOver (Mac) or NVDA (Windows). Tab through every interactive flow.

## Internationalization (i18n)

**Architecture decisions:**
- Use `next-intl`, `react-i18next`, or `FormatJS` depending on framework
- Extract ALL user-facing strings to locale files (never hardcode text in components)
- Design for text expansion (German/French can be 30-40% longer than English)
- Support RTL layouts (use logical properties: `ms-4` not `ml-4` in Tailwind, `start`/`end` not `left`/`right`)
- Format dates, numbers, currency with `Intl` API or library locale formatting
- Store locale preference (cookie + URL path prefix)

**File structure:**
```
locales/
  en/
    common.json
    auth.json
    dashboard.json
  es/
    common.json
    auth.json
    dashboard.json
```

**Key rules:**
- Never concatenate translated strings (word order varies by language)
- Use ICU message format for plurals and interpolation
- Provide context for translators in key names or comments
- Test with pseudo-localization to catch hardcoded strings and layout breaks
