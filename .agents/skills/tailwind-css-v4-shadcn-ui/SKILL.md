---
name: Tailwind CSS v4 + shadcn/ui
description: Expert guidance for building UIs with Tailwind CSS v4 and shadcn/ui components.
---

# Tailwind CSS v4 + shadcn/ui

Expert guidance for building UIs with Tailwind CSS v4 and shadcn/ui components.

## Capabilities

- Set up Tailwind CSS v4 with the new CSS-first configuration
- Install and customize shadcn/ui components
- Build responsive, accessible UI layouts
- Implement dark mode with CSS variables
- Create custom themes and design tokens
- Optimize for production builds

## Guidelines

### Tailwind CSS v4 Key Changes

- **CSS-first config**: No more `tailwind.config.js` — configure in CSS with `@theme`
- **New import**: Use `@import "tailwindcss"` instead of `@tailwind` directives
- **Native CSS variables**: Theme values are CSS custom properties by default
- **Automatic content detection**: No need to configure `content` paths
- **New default color palette**: Updated colors with OKLCH

### Setup (Vite + React)

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* app.css */
@import "tailwindcss";
```

### Theme Customization (CSS-first)

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.6 0.25 260);
  --color-secondary: oklch(0.7 0.15 180);
  --font-sans: "Inter", sans-serif;
  --radius-lg: 0.75rem;
  --breakpoint-3xl: 1920px;
}
```

### shadcn/ui Setup

```bash
npx shadcn@latest init
```

Choose options:
- Style: New York (recommended)
- Base color: Neutral
- CSS variables: Yes

### Adding Components

```bash
npx shadcn@latest add button card dialog input
```

### shadcn/ui Usage Pattern

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" size="sm">
          Click me
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Dark Mode

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));
```

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

### Best Practices

- Use CSS variables from `@theme` for consistent design tokens
- Prefer shadcn/ui components over building from scratch
- Customize components by editing the source in `components/ui/`
- Use `cn()` utility (from shadcn) for conditional class merging
- Keep component variants in the component file using `cva`
- Use `@apply` sparingly — prefer utility classes in markup
- Leverage new v4 features: container queries (`@container`), `@starting-style`

### cn() Utility

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Common Component Patterns

| Pattern | Components |
|---------|-----------|
| Form | `Input`, `Label`, `Select`, `Checkbox`, `RadioGroup` |
| Dialog/Modal | `Dialog`, `DialogTrigger`, `DialogContent` |
| Navigation | `NavigationMenu`, `Tabs`, `Breadcrumb` |
| Data Display | `Table`, `Card`, `Badge`, `Avatar` |
| Feedback | `Toast`, `Alert`, `Progress`, `Skeleton` |
| Layout | `Sheet`, `Separator`, `ScrollArea` |

## Dependencies

```json
{
  "tailwindcss": "^4",
  "@tailwindcss/vite": "^4",
  "class-variance-authority": "^0.7",
  "clsx": "^2",
  "tailwind-merge": "^3"
}
```
