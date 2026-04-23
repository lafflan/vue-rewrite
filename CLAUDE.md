# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm build          # Build all 3 packages (shared → overlay → plugin)
pnpm build:shared   # Build @vue-rewrite/shared (TypeScript)
pnpm build:overlay  # Build @vue-rewrite/overlay (Vite IIFE bundle)
pnpm build:plugin   # Build vite-plugin-vue-rewrite (TypeScript)
pnpm dev            # Watch mode for plugin dev workflow
pnpm typecheck      # Full TypeScript check across all packages
pnpm test           # Run vitest tests (plugin + overlay)
```

## Architecture

```
Browser (Vue3 App)
  └── Shadow DOM (#vue-rewrite-root)
        ├── HighlightCanvas.vue   # Canvas 2D overlay for selection/hover highlights
        └── PropertySidebar.vue    # Right panel — class token editor + property groups

WebSocket (ws://localhost:3457)
  ↕
vite-plugin-vue-rewrite (Node.js Vite Plugin)
  ├── configureServer hook       # Attaches WebSocket server to httpServer
  ├── transformIndexHtml hook     # Injects overlay IIFE <script> into HTML
  ├── transform hook (.vue files) # Parses SFC → injects data-vr-id into template AST
  └── tailwindResolver            # Parses tailwind.config.js → TailwindTokenMap → sends to overlay

@vue-rewrite/shared
  ├── protocol.ts                 # ClientMessage / ServerMessage type unions
  └── types.ts                    # VueStructuralPath, ComponentInfo, TailwindTokenMap, BatchOperation
```

### How element selection works

1. `transformSFC` in `packages/plugin/src/transform/sfcParser.ts` parses each `.vue` file with `@vue/compiler-sfc` + `@vue/compiler-dom`, injects a unique `data-vr-id` attribute on every template element
2. `useElementSelection` composable listens for `click`/`mousemove` on `document` with `capture: true`, finds the nearest `[data-vr-id]` ancestor, updates the `selection` Pinia store
3. `HighlightCanvas.vue` renders blue dashed-border highlights (selection) and gray semi-transparent highlights (hover) using Canvas 2D — only repaints positions for currently selected/hovered elements each frame
4. `PropertySidebar.vue` reads `classList` + `computedStyle` from the selected DOM element via `properties` store

### How property edits propagate to source files

`PropertySidebar` → calls `propertiesStore.updateClassList()` → constructs `VueStructuralPath` from `el.__vueParentComponent` → sends `ClientMessage` via `bridge.send()` over WebSocket → `messageHandler.ts` in plugin receives and processes

### Overlay IIFE bundling

Overlay is built as a single IIFE (`dist/overlay.js ~160KB`) by Vite's `lib` mode. It is injected into `index.html` via the plugin's `transformIndexHtml` hook which adds `<script src="/vue-rewrite/overlay.js">` before `</body>`.

## Package Responsibilities

| Package | Role |
|---------|------|
| `@vue-rewrite/shared` | Pure types/protocol — no runtime deps, consumed by both |
| `@vue-rewrite/overlay` | Vue 3 Shadow DOM app — all browser-side UI and state |
| `vite-plugin-vue-rewrite` | Vite plugin — SFC transform, WebSocket server, message handling |

## Key Files

- `packages/plugin/src/index.ts` — Vite plugin entry point; `configureServer`, `transformIndexHtml`, `transform` hooks
- `packages/plugin/src/transform/sfcParser.ts` — SFC → AST → `data-vr-id` injection → SFC string reconstruction
- `packages/plugin/src/server/messageHandler.ts` — All WebSocket message handlers (updateProperty, undo, deleteElement, etc.)
- `packages/overlay/src/bridge.ts` — WebSocket client with auto-reconnect (exponential backoff, max 5 attempts)
- `packages/overlay/src/stores/properties.ts` — CSS/computed style reading + Tailwind class update orchestration
- `packages/overlay/src/composables/useElementSelection.ts` — DOM event delegation for `[data-vr-id]` selection
- `packages/overlay/src/components/HighlightCanvas.vue` — Canvas 2D renderer; optimized to only update selected/hovered element positions per frame

## WebSocket Protocol

See `packages/shared/src/protocol.ts` for the full `ClientMessage` and `ServerMessage` unions. Notable messages:

- `tailwindTokens` — server → client, sent on WebSocket connect
- `updateProperty / updateText / deleteElement` — client → server, triggers source file modification
- `undo / commitBatch` — client → server, batch operations with operation history

## Important Constraints

- Overlay runs in Shadow DOM with `pointer-events: none` on root; only child elements with explicit `pointer-events: auto` are interactive (prevents blocking page clicks)
- `data-vr-id` injection must use a stable ID format — `vr-{timestamp}-{counter}` is currently used; ensure uniqueness within a component's template
- The plugin's `transform` hook must return the modified SFC code string (not a virtual module) so Vite continues normal processing
