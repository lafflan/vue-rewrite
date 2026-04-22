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

.class-editor {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.class-editor-header {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin-bottom: 10px;
}

.class-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
  min-height: 26px;
}

.class-token {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  color: #2563eb;
  max-width: 100%;
  transition: all 150ms ease;
}

.class-token:hover {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  transform: translateY(-1px);
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
  transition: color 150ms ease;
}

.remove-class:hover {
  color: #ef4444;
}

.no-classes {
  font-size: 11px;
  color: #cbd5e1;
  font-style: italic;
}

.class-input-row {
  display: flex;
  gap: 6px;
}

.class-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  outline: none;
  color: #0f172a;
  background: white;
  transition: all 150ms ease;
}

.class-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.add-class-btn {
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
  transition: all 150ms ease;
}

.add-class-btn:hover {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.property-sections {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.property-sections::-webkit-scrollbar {
  width: 6px;
}

.property-sections::-webkit-scrollbar-track {
  background: transparent;
}

.property-sections::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.property-sections::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
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
