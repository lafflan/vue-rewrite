<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useSelectionStore } from './stores/selection';
import { usePropertiesStore } from './stores/properties';
import { bridge } from './bridge';
import { useElementSelection } from './composables/useElementSelection';
import type { ServerMessage } from '@vue-rewrite/shared';

import PropertySidebar from './components/PropertySidebar.vue';
import HighlightCanvas from './components/HighlightCanvas.vue';

const selectionStore = useSelectionStore();
const propertiesStore = usePropertiesStore();

const isConnected = ref(false);
const showKeyboardHelp = ref(false);

// 启用元素选择/hover 系统
useElementSelection();

// Connection status handler
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = bridge.onMessage((msg: ServerMessage) => {
    if (msg.type === 'pong') {
      isConnected.value = true;
    } else if (msg.type === 'devServerDisconnected') {
      isConnected.value = false;
    } else if (msg.type === 'tailwindTokens') {
      propertiesStore.setTailwindTokens(msg.tokens);
    }
  });

  // Ping to check connection
  bridge.send({ type: 'ping' });
});

onUnmounted(() => {
  unsubscribe?.();
});

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // Don't capture if typing in input
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
    return;
  }

  switch (e.key) {
    case 'Escape':
      selectionStore.clear();
      break;
    case '?':
      showKeyboardHelp.value = !showKeyboardHelp.value;
      break;
    case 'z':
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        bridge.send({ type: 'undo', operationId: 'last' });
      }
      break;
    case 'Delete':
    case 'Backspace':
      if (selectionStore.hasSelection && selectionStore.selectedComponent) {
        e.preventDefault();
        bridge.send({
          type: 'deleteElement',
          path: {
            componentName: selectionStore.selectedComponent.name,
            filePath: selectionStore.selectedComponent.filePath,
            segments: [],
          },
        });
        selectionStore.clear();
      }
      break;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="vr-overlay">
    <!-- Highlight Canvas (rendered behind UI) -->
    <HighlightCanvas />

    <!-- Property Sidebar (right side) -->
    <PropertySidebar v-if="selectionStore.hasSelection" />

    <!-- Keyboard Help Modal -->
    <div v-if="showKeyboardHelp" class="keyboard-help" @click="showKeyboardHelp = false">
      <div class="keyboard-help-content" @click.stop>
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcuts-grid">
          <div class="shortcut">
            <kbd>Esc</kbd>
            <span>Clear selection</span>
          </div>
          <div class="shortcut">
            <kbd>?</kbd>
            <span>Toggle this help</span>
          </div>
          <div class="shortcut">
            <kbd>Cmd/Ctrl + Z</kbd>
            <span>Undo</span>
          </div>
          <div class="shortcut">
            <kbd>Cmd/Ctrl + Shift + Z</kbd>
            <span>Redo</span>
          </div>
          <div class="shortcut">
            <kbd>Delete</kbd>
            <span>Delete selected</span>
          </div>
        </div>
        <button class="close-btn" @click="showKeyboardHelp = false">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vr-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999999;
  font-family: Inter, system-ui, sans-serif;
}

.vr-overlay > * {
  pointer-events: auto;
}

.keyboard-help {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.keyboard-help-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.keyboard-help-content h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.shortcuts-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut kbd {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: monospace;
  min-width: 100px;
  text-align: center;
}

.shortcut span {
  color: #64748b;
  font-size: 13px;
}

.close-btn {
  margin-top: 16px;
  width: 100%;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.close-btn:hover {
  background: #2563eb;
}
</style>
