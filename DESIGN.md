# Multica Design System

This document outlines the design system, styling architecture, color palette, and typography used across the Multica platform (Web, Desktop, Mobile).

## Overview

Multica uses a shared design system built with **Tailwind CSS v4 (or equivalent inline `@theme`)**, custom **CSS Variables** defining an **OKLCH-based color palette**, and atomic UI components derived from **shadcn/ui**. The core design tokens and base styles are shared across all applications via the `@multica/ui` package.

### Key Principles

1.  **Semantic Tokens:** Colors and sizes are named by their function (e.g., `--text-body`, `--surface-hover`) rather than arbitrary values.
2.  **OKLCH Colors:** The color system is entirely built on the OKLCH color space, allowing for precise control over lightness, chroma, and hue, ensuring WCAG AA accessibility compliance across both light and dark themes.
3.  **Cross-Platform Consistency:** Core styles (`tokens.css`, `base.css`) are imported into Web, Desktop, and Docs apps to maintain a unified look and feel.
4.  **Careful Typography:** Distinct font scales and meticulously configured CJK (Chinese, Japanese, Korean) fallbacks.

---

## 1. Design Tokens (`tokens.css`)

The source of truth for all design tokens is `packages/ui/styles/tokens.css`. It uses the `@theme` directive to map CSS variables to Tailwind classes.

### Typography Scale

Multica does not use Tailwind's default `text-xs`, `text-sm`, etc., because they lead to arbitrary, unstructured sizing. Instead, it uses a semantic type scale where every step has a defined role and a paired line-height.

- `--text-micro` (11px / 15px lh): Counters, badges, timestamps, overline labels.
- `--text-caption` (12px / 16px lh): Secondary and helper text (formerly `text-xs`).
- `--text-label` (13px / 18px lh): Dense labels like table headers, metadata rows.
- `--text-body` (14px / 20px lh): The main UI workhorse (formerly `text-sm`).
- `--text-body-lg` (15px / 22px lh): Roomier body for dialog copy and onboarding prose.
- `--text-title-sm` (16px / 24px lh): Small headings.
- `--text-title` (18px / 28px lh): Section headings.
- `--text-title-lg` (20px / 28px lh): Card and dialog titles.
- `--text-display-sm` (24px / 32px lh): Page titles.
- `--text-display` (36px / 40px lh): Hero numbers and empty-state headlines.

### Color System (OKLCH)

The color palette is strictly defined in OKLCH.

#### Surfaces

- `--app-shell`: The quiet outer frame of the app.
- `--page-canvas`: The main background where lists and boards live.
- `--surface`: Bounded content groups (cards, panels).
- `--surface-raised`: Ephemeral overlays (dialogs, popovers).
- `--surface-hover`, `--surface-selected`: Interactive states.

#### Text & Accents

- `--foreground`: Primary text color.
- `--muted-foreground`: Secondary text (pinned for WCAG AA compliance against all surfaces).
- `--faint-foreground`: Non-text quiet elements (disclosure chevrons, separators).
- `--primary`, `--secondary`, `--destructive`, `--success`, `--warning`, `--info`: Semantic UI colors.
- `--brand`: The core product blue (`oklch(0.55 0.16 255)` in light, `oklch(0.65 0.16 255)` in dark).

#### Data Visualization

- `--chart-1` to `--chart-5`: A monochromatic gradient derived from the brand hue (255) for stacked bars and graphs.

### Shadows & Radii

- Standardized border radii from `--radius-sm` to `--radius-4xl`, based on a core `--radius` of `0.625rem`.
- Semantic shadows: `--surface-shadow` for cards, `--menu-shadow` for dropdowns, `--floating-shadow` for dialogs.

---

## 2. Typography & Font Stacks

Global typography rules are established in `apps/web/app/globals.css` and mirrored in the Desktop app.

### Sans-Serif Stack

The default sans-serif font is **Inter** (via `next/font`), mapped to `--font-sans`.

- **CJK Fallback Strategy:** A carefully crafted fallback chain ensures Chinese, Japanese, and Korean characters render perfectly.
- By default, Chinese (`PingFang SC`, `Microsoft YaHei`) precedes Korean (`Apple SD Gothic Neo`, `Malgun Gothic`).
- A specific BCP-47 rule (`html[lang|="ja"]`) promotes Japanese fonts (`Hiragino Sans`, `Meiryo`) so Japanese users don't see Chinese glyph shapes for shared Kanji.

### Editorial Serif Stack

Used heavily on the landing pages, utilizing **Instrument Serif**.

- Like the sans stack, it includes a tailored CJK fallback chain (`Songti SC`, `Hiragino Mincho ProN`, `Nanum Myeongjo`).
- Language-specific adjustments are made for CJK headings to remove negative tracking and adjust line-height (`letter-spacing: 0; line-height: 1.25;`), as Latin-tuned display settings break Han/Hangul layout.
- Korean headings receive `word-break: keep-all` to ensure words aren't split arbitrarily mid-syllable.

### Typographic Rendering Rules

- `text-autospace: ideograph-alpha ideograph-numeric;`: Automatically adds spacing between CJK ideographs and Latin alphanumeric characters (supported in Chrome 119+).
- `font-synthesis: style;`: Forbids the browser from synthesizing bold weights (which smears CJK fonts) while allowing synthesized italics for fonts that lack an italic variant.

---

## 3. Global CSS & Animations (`base.css`)

The `packages/ui/styles/base.css` file contains global resets and custom animations.

### Custom Animations

- `animate-entrance-spin`: A 0.6s spin and fade-in for the Multica icon.
- `animate-onboarding-enter`: A 400ms fade for onboarding step transitions.
- `animate-chat-impulse`: A gentle color and box-shadow pulse for the Chat FAB when an agent task is running.
- `animate-chat-text-shimmer`: A pure-CSS ChatGPT-style sweeping gradient over text, indicating an agent is "thinking".
- `animate-nav-progress-sweep`: A brand-colored sweep at the top of the dashboard indicating routing progress.
- `.border-beam`: A continuous conic-gradient sweep around the border of an element, drawing attention to primary CTAs.

### Layout & Micro-interactions

- **Scrollbars:** Custom slim scrollbars (`--scrollbar-thumb`, `--scrollbar-track`) styling on WebKit.
- **Find Match Highlight:** Uses the CSS Custom Highlight API (`::highlight(multica-find)`) to paint search matches over DOM content without mutating the HTML.
- **iOS Zoom Fix:** `font-size: 16px !important;` on inputs for mobile viewports to prevent Safari from auto-zooming.
- **Sidebar Resizing:** Global lock on cursors (`cursor: ew-resize !important`) and transitions while the sidebar is actively being dragged.

---

## 4. Theme Modes

- **Dark Mode:** Implemented via the `.dark` class overriding the CSS variables in `tokens.css`. Lightness curves are inverted, and shadows are deepened.
- **Landing Page Lock:** The landing routes (`/`) utilize hard-coded sections. To prevent nested theme-aware components from flipping to dark mode, a `.landing-light` scope is used in `apps/web/app/custom.css` to lock CSS variables to their light mode values, ensuring the marketing site always looks as intended.

---

## 5. UI Component Library

The atomic UI components live in `packages/ui/src/components`.

- Built on top of Radix UI primitives.
- Styled with Tailwind CSS using the design tokens defined above.
- Components like `Button`, `Dialog`, `Popover`, `Select` encapsulate all the necessary hover, active, and focus states.
- **Markdown Rendering:** Specific styles are located in `packages/ui/markdown/markdown.css` and `packages/views/editor/styles/*` for rendering rich text, code blocks (using Shiki dual themes), and mermaid diagrams.
