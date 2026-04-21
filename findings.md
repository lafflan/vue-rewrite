# vue-rewrite Research Findings

## 1. Vue 3 AST Transformation Alternatives to jscodeshift

### @vue/compiler-dom / @vue/compiler-sfc
- **Official Vue parser**: Part of Vue 3 core compilation chain
- **Handles**: .vue SFC files, template parsing, script block analysis
- **Output**: Template AST (not render function AST)
- **Best for**: Template transformations, attribute injection
- **Limitation**: Does not handle JSX or script content modification directly

### vue-eslint-parser
- **Purpose**: ESLint plugin for Vue
- **Output**: ESTree-compatible AST
- **Best for**: Linting, code analysis
- **Limitation**: Geared toward validation, not transformation

### @babel/parser + @babel/plugin-transform-vue-jsx
- **Purpose**: Parse Vue JSX syntax
- **Best for**: Projects using vue-jsx plugin
- **Limitation**: Vue 3 JSX is different from React JSX

### Recommended Strategy
1. **@vue/compiler-dom**: Parse SFC template block, inject data-vr-id attributes
2. **@vue/compiler-sfc**: Analyze script and style blocks (descriptor structure)
3. **@babel/parser** with TypeScript plugin: Modify script block content when needed

---

## 2. Component Selection in Vue 3

### React Approach (for reference)
- React Fiber nodes have `_debugSource` pointing to file location
- Can traverse fiber tree to find component instance

### Vue 3 Approach
- Vue 3 component instances are NOT directly attached to DOM nodes
- BUT: Vue adds `__vueParentComponent` to DOM elements
- DOM element -> `__vueParentComponent` -> ComponentInstance

```typescript
function getVueComponent(element: Element): ComponentInternalInstance | null {
  let el = element;
  while (el && el !== document.body) {
    const vueInstance = (el as any).__vueParentComponent;
    if (vueInstance) return vueInstance;
    el = el.parentElement;
  }
  return null;
}
```

### Alternative: data-vr-id Injection
- During transform, inject unique IDs into template
- On selection, read ID from DOM
- Look up component metadata from Map

---

## 3. Vite Plugin Architecture

### Key Plugin Hooks for vue-rewrite

| Hook | Purpose |
|------|---------|
| `configureServer` | Set up WebSocket server, inject overlay |
| `transform` | Intercept SFC files, inject selection markers |
| `handleHotUpdate` | Notify overlay of file changes |
| `transformIndexHtml` | Inject overlay script into HTML |

### WebSocket Server Integration
```typescript
configureServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  
  server.httpServer?.on('upgrade', (request, socket, head) => {
    if (request.url === '/vite-rewrite-ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
}
```

---

## 4. Vue SFC Structure

### Single File Component Blocks
```
<template>
  <!-- template block - processed by @vue/compiler-dom -->
</template>

<script setup>
  // script block with setup - processed by @vue/compiler-sfc
</script>

<script>
  // script block regular - also @vue/compiler-sfc
</script>

<style scoped>
  // style block with scoped attribute
</style>
```

### Parsing Result Structure
```typescript
interface SFCDescriptor {
  filename: string;
  template?: { content: string; ast: RootNode; }
  script?: { content: string; ast?: ASTNode; }
  scriptSetup?: { content: string; ast?: ASTNode; }
  styles: Array<{ content: string; scoped: boolean; }>
}
```

---

## 5. Property Editing in Vue

### class vs :class
```vue
<!-- Static class -->
<div class="foo bar">

<!-- Dynamic binding -->
<div :class="myClass">

<!-- Object syntax -->
<div :class="{ active: isActive, 'text-red': hasError }">

<!-- Array syntax -->
<div :class="[classA, classB]">
```

### :style Bindings
```vue
<div :style="{ color: textColor, fontSize: fontSize + 'px' }">
<div :style="styleObject">
```

### Edit Strategy
1. Detect existing static `class` attribute
2. Detect existing `:class` binding and parse its expression
3. For new classes: append to static class or add to binding
4. Track original binding type for proper serialization

---

## 6. State Management Options

### Option A: Pinia (Recommended)
- Vue 3 official state management
- DevTools integration
- TypeScript support
- Familiar Redux-like patterns

### Option B: reactive/ref
- Vue 3 built-in reactivity
- No extra dependency
- More manual management

### Option C: zustand with Vue adapter
- React-like pattern
- Can work with Vue via wrapper

### Recommended: Pinia
- Better devtools integration for debugging
- Official Vue recommendation
- Familiar for team with React background

---

## 7. Type System Design

### ComponentInfo Type
```typescript
interface ComponentInfo {
  id: string;                    // Unique identifier
  name: string;                  // Component name
  filePath: string;              // Absolute path to SFC
  lineNumber: number;            // Starting line
  
  // Vue-specific
  isSetupScript: boolean;        // <script setup> vs <script>
  hasScopedStyles: boolean;
  
  // Content
  templateContent?: string;
  scriptContent?: string;
  
  // Structure
  children: ComponentChild[];
  props: ComponentProps;
}
```

### EditOperation Type
```typescript
type EditOperation =
  | { type: 'class:add'; targetId: string; className: string }
  | { type: 'class:remove'; targetId: string; className: string }
  | { type: 'style:set'; targetId: string; property: string; value: string }
  | { type: 'content:set'; targetId: string; content: string }
  | { type: 'element:move'; targetId: string; newParentId: string; index: number };
```

---

## 8. Shadow DOM Consideration

### Original React Version
- Uses Shadow DOM to isolate overlay from target app styles
- Ensures overlay UI looks consistent regardless of target app

### Vue 3 Version - Different Approach
- Vue's scoped styles and component encapsulation provide isolation
- No Shadow DOM needed for overlay UI
- Simpler architecture

### Why No Shadow DOM for Vue?
1. Vue components already encapsulate styles
2. Scoped CSS (vue scoped attribute) prevents style leakage
3. Easier to integrate with Vue devtools
4. Avoids Shadow DOM complexity

---

## 9. Tailwind Class Mapping

### Framework-Agnostic
- Tailwind processes CSS at build time
- Works the same regardless of React or Vue
- Just need to ensure class names are in the DOM

### Implementation
1. Parse Tailwind config to get class definitions
2. UI shows available classes from config
3. On selection, read computed classes from DOM
4. On edit, update class attribute

---

## 10. Comparison: React Fiber vs Vue Component Instance

| Aspect | React | Vue 3 |
|--------|-------|-------|
| DOM representation | Fiber nodes | Proxy objects |
| Debug info | _debugSource | __vueParentComponent |
| AST | JSX with jscodeshift | .vue with @vue/compiler-dom |
| Virtual DOM | React's reconciler | Vue's reactivity system |
| Component tree | Fiber traversal | Component instance tree |

---

## 11. Build Tool Considerations

### Why Vite over Nuxt or CRA?
- Vite provides native plugin hooks
- SSR not needed (devtool overlay only)
- Faster HMR
- Better dev server integration

### WebSocket Library
- `ws`: Fast, pure JavaScript WebSocket
- Alternative: `socket.io` if fallbacks needed
- Recommendation: `ws` (simpler for this use case)
