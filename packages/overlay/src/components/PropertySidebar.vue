<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSelectionStore } from '../stores/selection';
import { useCanvasStore } from '../stores/canvas';
import StylesPanel from './StylesPanel.vue';

const selectionStore = useSelectionStore();
const canvasStore = useCanvasStore();

const sidebarWidth = ref(280);
const isResizing = ref(false);

const component = computed(() => selectionStore.selectedComponent);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
}

function handleResize(e: MouseEvent) {
  const newWidth = Math.min(Math.max(260, window.innerWidth - e.clientX), 380);
  sidebarWidth.value = newWidth;
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  localStorage.setItem('vr-sidebar-width', String(sidebarWidth.value));
}

// Load saved width
const savedWidth = localStorage.getItem('vr-sidebar-width');
if (savedWidth) {
  sidebarWidth.value = parseInt(savedWidth, 10);
}
</script>

<template>
  <div class="property-sidebar" :style="{ width: `${sidebarWidth}px` }">
    <!-- Resize handle -->
    <div class="resize-handle" @mousedown="startResize"></div>

    <!-- Header -->
    <div class="sidebar-header">
      <h3>Styles</h3>
      <button class="close-btn" @click="selectionStore.clearSelection">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Component info -->
    <div v-if="component" class="component-info">
      <span class="component-name">{{ component.name }}</span>
      <span class="component-path">{{ component.filePath }}</span>
    </div>

    <!-- Styles Panel (Chrome DevTools style) -->
    <StylesPanel />

    <!-- Saving indicator -->
    <div v-if="canvasStore.isBatching" class="saving-indicator">
      <span class="saving-dot"></span>
      Saving...
    </div>
  </div>
</template>

<style scoped>
.property-sidebar {
  position: fixed;
  right: 16px;
  top: 16px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 10px 20px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  background: transparent;
  transition: background 200ms ease;
  z-index: 10;
}

.resize-handle:hover {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.3), transparent);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(180deg, #fafbfc, #ffffff);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 150ms ease;
}

.close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.component-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.component-name {
  font-weight: 600;
  font-size: 12px;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.component-name::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
}

.component-path {
  font-size: 10px;
  color: #94a3b8;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  padding: 3px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  display: inline-block;
}

.saving-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  font-size: 11px;
  font-weight: 500;
}

.saving-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}
</style>
