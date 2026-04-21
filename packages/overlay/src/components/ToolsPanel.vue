<script setup lang="ts">
import { ref } from 'vue';
import { useCanvasStore } from '../stores/canvas';

const emit = defineEmits<{
  (e: 'toggle-changelog'): void;
  (e: 'show-help'): void;
}>();

const canvasStore = useCanvasStore();

const currentTool = ref<'select' | 'text' | 'move'>('select');

function selectTool(tool: 'select' | 'text' | 'move') {
  currentTool.value = tool;
}
</script>

<template>
  <div class="tools-panel">
    <div class="tools-group">
      <!-- Select Tool -->
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'select' }"
        title="Select (V)"
        @click="selectTool('select')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          <path d="M13 13l6 6"/>
        </svg>
      </button>

      <!-- Text Tool -->
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'text' }"
        title="Text (T)"
        @click="selectTool('text')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
      </button>

      <!-- Move Tool -->
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'move' }"
        title="Move (M)"
        @click="selectTool('move')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
        </svg>
      </button>
    </div>

    <div class="tools-divider"></div>

    <div class="tools-group">
      <!-- Canvas Toggle -->
      <button class="tool-btn" title="Toggle Canvas">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18M3 9h18"/>
        </svg>
      </button>

      <!-- Undo -->
      <button class="tool-btn" title="Undo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4"/>
        </svg>
      </button>
    </div>

    <div class="tools-divider"></div>

    <div class="tools-group">
      <!-- Changelog -->
      <button class="tool-btn" title="Changelog" @click="emit('toggle-changelog')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v4l3 3"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </button>

      <!-- Reset -->
      <button class="tool-btn" title="Reset Canvas" @click="canvasStore.resetTransform">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>

      <!-- Help -->
      <button class="tool-btn" title="Keyboard Shortcuts (?)" @click="emit('show-help')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
        </svg>
      </button>
    </div>

    <!-- Pending changes badge -->
    <div v-if="canvasStore.hasPendingChanges" class="pending-indicator">
      {{ canvasStore.pendingChangesCount }}
    </div>
  </div>
</template>

<style scoped>
.tools-panel {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.tools-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tools-divider {
  height: 1px;
  margin: 4px 0;
  background: #e2e8f0;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  transition: all 150ms;
}

.tool-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tool-btn.active {
  background: #3b82f6;
  color: white;
}

.pending-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #f59e0b;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
