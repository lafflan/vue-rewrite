# vue-rewrite Implementation Plan

## Project Overview
Rewrite react-rewrite (visual React component editor) as a Vue3 + Vite plugin with full feature parity.

## Original Architecture (react-rewrite)
- **Monorepo structure**: 3 packages (cli, overlay, shared)
- **CLI package**: WebSocket server, HTTP proxy, AST transforms via jscodeshift
- **Overlay package**: Browser UI injected via Shadow DOM
- **Communication**: WebSocket between overlay and CLI
- **Key features**: Element selection, property editing, drag-to-reorder, text editing, Tailwind class mapping, batch operations with undo

## Target Architecture (vue-rewrite)

### Package Structure
```
vue-rewrite/
├── packages/
│   ├── shared/           # Shared types, interfaces, utilities
│   ├── plugin/           # Vite plugin (replaces CLI)
│   └── overlay/          # Browser UI overlay (Vue 3)
├── package.json          # Workspace root
└── pnpm-workspace.yaml
```

---

## Phase 1: Project Setup & Shared Package

### 1.1 Shared Package (@vue-rewrite/shared)
**Responsibilities**: Type definitions, protocol messages, utilities

**Vue-specific Type Adaptations**:
- `ComponentInfo` needs Vue-specific fields:
  - `isSetupScript: boolean` - Composition API vs Options API
  - `hasScopedStyles: boolean`
  - `templateContent?: string` - Raw SFC template
  - `scriptContent?: string` - Raw SFC script

### 1.2 Design: WebSocket Protocol
**Messages from Overlay to Plugin**:
- component:selected, component:updated, selection:cleared, overlay:ready

**Messages from Plugin to Overlay**:
- component:info, components:list, operation:result

---

## Phase 2: Vite Plugin (@vue-rewrite/plugin)

### 2.1 Plugin Architecture
Core hooks: configureServer, transform, handleHotUpdate

### 2.2 Vue AST Handling
Use @vue/compiler-dom for template AST + @vue/compiler-sfc for script block analysis

### 2.3 Overlay Script Injection
Use transformIndexHtml hook or virtual module approach

---

## Phase 3: Overlay Package (@vue-rewrite/overlay)

### 3.1 Component Selection Mechanism
Inject data-vr-id attributes, use __vueParentComponent for traversal

### 3.2 Property Editing
Handle static class, :class bindings (object/array/dynamic), :style bindings

### 3.3 State Management
Pinia for overlay state with devtools integration

---

## Critical Challenges

1. **jscodeshift Alternative**: Use @vue/compiler-dom + @babel/parser for script block
2. **Vue Component Selection**: Inject data-vr-id, DOM traversal via __vueParentComponent
3. **Vite Dev Server Integration**: WebSocket server attached to Vite HTTP server
4. **SFC Template Modification**: Parse -> Walk AST -> Inject -> Serialize
5. **Drag-to-Reorder**: AST node relocation with proper index handling

---

## Implementation Sequence

1. Environment setup (pnpm workspace, TypeScript)
2. Shared package - types and protocol
3. Plugin skeleton - basic Vite plugin hooks
4. WebSocket server integration
5. SFC parsing with @vue/compiler-dom
6. Selection attribute injection
7. Overlay UI - basic Vue 3 app with Pinia
8. WebSocket communication layer
9. Component tree extraction
10. Property editing (classes, styles)
11. Drag-to-reorder functionality
12. Undo/redo system
13. Tailwind class mapping
14. Batch operations
15. Testing and polish

---

## Dependencies

### Shared: typescript, @types/node

### Plugin: vite, @vue/compiler-dom, @vue/compiler-sfc, @babel/parser, ws, chokidar

### Overlay: vue, pinia, @vueuse/core, tailwind-merge
