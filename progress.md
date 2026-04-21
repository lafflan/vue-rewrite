# vue-rewrite Progress Log

## Session: 2026-04-20

### Completed
- [x] Created task_plan.md with comprehensive implementation plan
- [x] Created findings.md with research on Vue 3 AST, component selection, Vite plugin architecture
- [x] Identified critical challenges:
  1. jscodeshift alternative (use @vue/compiler-dom + @babel/parser)
  2. Vue component selection (inject data-vr-id + __vueParentComponent traversal)
  3. WebSocket integration with Vite dev server
  4. SFC template modification (parse -> inject -> serialize)
  5. Drag-to-reorder (AST node relocation)

### Plan Structure

**Package Structure**:
- `packages/shared/` - Types, protocol, utilities
- `packages/plugin/` - Vite plugin (replaces CLI)
- `packages/overlay/` - Vue 3 browser UI overlay

**Implementation Sequence** (15 phases):
1. Environment setup
2. Shared package
3. Plugin skeleton
4. WebSocket server
5. SFC parsing
6. Selection injection
7. Overlay UI
8. WebSocket communication
9. Component tree
10. Property editing
11. Drag-to-reorder
12. Undo/redo
13. Text editing
14. Tailwind mapping
15. Batch operations & polish

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AST for template | @vue/compiler-dom | Official Vue parser |
| AST for script | @babel/parser | TypeScript support |
| State management | Pinia | Vue official, devtools |
| WebSocket | ws library | Lightweight, fast |
| Style isolation | Vue scoped styles | No Shadow DOM needed |

### Challenges Identified

1. **jscodeshift has no Vue equivalent** - Need combination of @vue/compiler-dom (template) + @babel/parser (script)

2. **Vue component selection** - React uses _debugSource on Fiber; Vue uses __vueParentComponent on DOM elements

3. **Vite plugin hooks** - configureServer for WebSocket, transformIndexHtml for overlay injection

4. **SFC modification** - Parse with @vue/compiler-dom, walk AST, inject attributes, serialize back

5. **Drag-to-reorder** - Move AST nodes between parents at correct index

### Next Steps
When implementation begins:
1. Initialize pnpm workspace
2. Create shared package with type definitions
3. Build plugin skeleton with Vite hooks
4. Implement WebSocket server
5. Test with sample Vue 3 project
