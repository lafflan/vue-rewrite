<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSelectionStore } from '../stores/selection';
import { useCanvasStore } from '../stores/canvas';
import { usePropertiesStore } from '../stores/properties';
import type { PropertyGroup } from '@vue-rewrite/shared';
import PropertySection from './PropertySection.vue';

const selectionStore = useSelectionStore();
const canvasStore = useCanvasStore();
const propertiesStore = usePropertiesStore();

const sidebarWidth = ref(280);
const isResizing = ref(false);
const newClassInput = ref('');

const propertyGroups: { key: PropertyGroup; label: string }[] = [
  { key: 'layout', label: 'Layout' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'size', label: 'Size' },
  { key: 'typography', label: 'Typography' },
  { key: 'background', label: 'Background' },
  { key: 'border', label: 'Border' },
];

const component = computed(() => selectionStore.selectedComponent);
const classList = computed(() => propertiesStore.classList);

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

function removeClass(cls: string) {
  const newList = classList.value.filter((c) => c !== cls);
  propertiesStore.updateClassList(newList);
}

function addClassFromInput() {
  const cls = newClassInput.value.trim();
  if (!cls || classList.value.includes(cls)) {
    newClassInput.value = '';
    return;
  }
  propertiesStore.updateClassList([...classList.value, cls]);
  newClassInput.value = '';
}

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') addClassFromInput();
  else if (e.key === 'Escape') newClassInput.value = '';
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
      <h3>Properties</h3>
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

    <!-- Class Token Editor -->
    <div class="class-editor">
      <div class="class-editor-header">Classes</div>
      <div class="class-tokens">
        <span
          v-for="cls in classList"
          :key="cls"
          class="class-token"
        >
          {{ cls }}
          <button class="remove-class" @click="removeClass(cls)" title="Remove class">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </span>
        <span v-if="classList.length === 0" class="no-classes">No classes</span>
      </div>
      <div class="class-input-row">
        <input
          v-model="newClassInput"
          class="class-input"
          placeholder="Add class…"
          @keydown="handleInputKeydown"
          @blur="addClassFromInput"
        />
        <button class="add-class-btn" @click="addClassFromInput">+</button>
      </div>
    </div>

    <!-- Property sections -->
    <div class="property-sections">
      <PropertySection
        v-for="group in propertyGroups"
        :key="group.key"
        :group="group.key"
        :label="group.label"
      />
    </div>

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
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 150ms;
}

.resize-handle:hover {
  background: #3b82f6;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.component-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.component-name {
  font-weight: 600;
  font-size: 13px;
  color: #0f172a;
}

.component-path {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.class-editor {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.class-editor-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 8px;
}

.class-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  min-height: 24px;
}

.class-token {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-family: monospace;
  color: #1d4ed8;
  max-width: 100%;
}

.remove-class {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #93c5fd;
  line-height: 1;
  flex-shrink: 0;
}

.remove-class:hover {
  color: #ef4444;
}

.no-classes {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

.class-input-row {
  display: flex;
  gap: 4px;
}

.class-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: monospace;
  outline: none;
  color: #0f172a;
}

.class-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #bfdbfe;
}

.add-class-btn {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
}

.add-class-btn:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.property-sections {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.saving-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
}

.saving-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
