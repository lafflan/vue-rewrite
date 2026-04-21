# vue-rewrite

A visual editing overlay for Vue 3 SFC components, powered by a Vite plugin.

## How it works

vue-rewrite injects a visual overlay into your running Vue 3 dev server. It parses `.vue` SFCs, injects unique `data-vr-id` attributes into template elements, and establishes a WebSocket connection between the overlay and the Vite plugin for real-time editing.

```
Vue SFC (source)            Vite Plugin                    Browser Overlay
───────────────────────     ───────────────────────        ────────────────────
<template>                   parseSFC()                      querySelectorAll('[data-vr-id]')
  <div data-vr-id="…">  ──►  inject data-vr-id  ───────►  Canvas 2D highlights
</template>                  AST reconstruction              Click → select element
                              │
                              │ WebSocket (ws://localhost:3457)
                              │
                              ▼
                         messageHandler.ts
                              │
                              ▼
                         Write to source file
```

## Features

- **Click to select** — hover and click any element in the browser to select it
- **Visual highlights** — Canvas 2D overlay shows selection (blue) and hover (gray) states
- **Class token editor** — view, add, and remove CSS classes directly from the property panel
- **Inline text editing** — double-click to edit text content (planned)
- **Drag to reorder** — reorder template elements via drag (planned)
- **Tailwind-aware** — reads your `tailwind.config.js` tokens and maps CSS values back to utility classes
- **Undo/redo** — full operation history with server-side revert
- **Scoped style safe** — understands Vue's scoped CSS and avoids breaking it

## Packages

| Package | Description |
|---------|-------------|
| `@vue-rewrite/shared` | Shared TypeScript types, protocol definitions |
| `@vue-rewrite/overlay` | Vue 3 Shadow DOM app — browser UI and state |
| `vite-plugin-vue-rewrite` | Vite plugin — SFC transform, WebSocket server, file operations |

## Setup

### 1. Install

```bash
pnpm add vite-plugin-vue-rewrite @vue-rewrite/shared -D
```

### 2. Configure Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueRewrite from 'vite-plugin-vue-rewrite'

export default defineConfig({
  plugins: [
    vue(),
    vueRewrite({
      enabled: true,
      wsPort: 3457,         // WebSocket port (default: 3457)
      verbose: false,        // Enable debug logging
      tailwindConfigPath: './tailwind.config.js', // optional
    }),
  ],
})
```

### 3. Run dev server

```bash
pnpm dev
```

Open your Vue 3 app in the browser. The overlay will appear automatically.

## Architecture

### Selection system

`vite-plugin-vue-rewrite` transforms every `.vue` file's `<template>` block through `@vue/compiler-dom`. It walks the template AST and injects `data-vr-id="vr-{timestamp}-{counter}"` on every element node. These IDs are stable per session and used to bind DOM elements back to their component source.

In the overlay, `useElementSelection` listens on `document` (capture phase) for `click`/`mousemove`. It traverses from the event target upward looking for `[data-vr-id]`, then updates the Pinia `selection` store. The Canvas 2D renderer (`HighlightCanvas.vue`) only repaints positions for currently selected/hovered elements each animation frame — avoiding full-DOM scans.

### Property editing

`PropertySidebar.vue` reads `computedStyle` and `classList` from the selected DOM element via the `properties` store. When a class is added or removed, the store:
1. Updates the DOM immediately (optimistic UI)
2. Constructs a `VueStructuralPath` from `el.__vueParentComponent`
3. Sends a `ClientMessage` over WebSocket to the plugin

The plugin's `messageHandler.ts` receives the message, performs the AST transformation on the source file, and writes it back.

### Tailwind integration

`tailwindResolver` reads `tailwind.config.js` and builds a `TailwindTokenMap`. This map is sent to the overlay on WebSocket connect (`tailwindTokens` message) and used to reverse-map CSS values back to their Tailwind equivalents when displaying computed styles.

## CLI / Commands

```bash
pnpm build              # Build all packages
pnpm build:shared       # Build @vue-rewrite/shared
pnpm build:overlay       # Build @vue-rewrite/overlay (IIFE bundle)
pnpm build:plugin        # Build vite-plugin-vue-rewrite
pnpm dev                 # Watch mode for plugin development
pnpm typecheck           # Full TypeScript check
pnpm test                # Run vitest tests
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Clear selection |
| `?` | Toggle keyboard help |
| `Cmd/Ctrl + Z` | Undo last operation |
| `Delete` | Delete selected element |

## Message protocol

All messages are typed in `packages/shared/src/protocol.ts`.

**Client → Server**: `ping`, `updateProperty`, `updateText`, `deleteElement`, `undo`, `commitBatch`, `discoverFile`, `reorderElement`, etc.

**Server → Client**: `pong`, `tailwindTokens`, `componentInfo`, `updatePropertyComplete`, `undoComplete`, etc.

## Limitations

- Elements must be inside a `<template>` block for `data-vr-id` injection (raw HTML outside SFCs is not supported)
- `<slot>` elements and `<component :is="...">` dynamic components require special handling
- Inline styles and `:style` bindings are read-only in the current version
- Compound Tailwind classes (e.g. `md:px-4`) display but editing support is partial
