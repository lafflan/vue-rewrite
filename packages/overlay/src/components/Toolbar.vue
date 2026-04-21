<script setup lang="ts">
import { useSelectionStore } from '../stores/selection';
import { useCanvasStore } from '../stores/canvas';
import { useHistoryStore } from '../stores/history';
import { bridge } from '../bridge';
import type { ClientMessage } from '@vue-rewrite/shared';

defineProps<{
  isConnected: boolean;
}>();

const selectionStore = useSelectionStore();
const canvasStore = useCanvasStore();
const historyStore = useHistoryStore();

function handleUndo() {
  const action = historyStore.undo();
  if (action) {
    bridge.send({ type: 'undo', operationId: `undo-${Date.now()}` } as ClientMessage);
  }
}

function handleRedo() {
  const action = historyStore.redo();
  if (action) {
    bridge.send({ type: 'commitBatch', operations: [] } as ClientMessage);
  }
}

function handleConfirm() {
  if (canvasStore.hasPendingChanges) {
    bridge.send({
      type: 'commitBatch',
      operations: canvasStore.pendingOperations as ClientMessage['type'] extends 'commitBatch' ? Parameters<Extract<ClientMessage, { type: 'commitBatch' }>>[0]['operations'] : never,
    } as ClientMessage);
    canvasStore.commitBatch();
  }
}

function handleCancel() {
  canvasStore.clearPendingOperations();
  selectionStore.clear();
}

function handleClose() {
  canvasStore.clearAll();
  historyStore.clear();
  selectionStore.clear();
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <!-- Connection status -->
      <div class="connection-status" :class="{ connected: isConnected }">
        <span class="status-dot"></span>
        <span class="status-text">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>

      <!-- Selected element info -->
      <div v-if="selectionStore.hasSelection" class="selected-info">
        <span class="element-tag">{{ selectionStore.selectedComponent?.name || 'Element' }}</span>
        <span class="element-path">{{ selectionStore.selectedComponent?.filePath }}</span>
      </div>
    </div>

    <div class="toolbar-center">
      <!-- Pending changes indicator -->
      <div v-if="canvasStore.hasPendingChanges" class="pending-badge">
        <span class="pending-dot"></span>
        <span>{{ canvasStore.pendingChangesCount }} pending</span>
      </div>
    </div>

    <div class="toolbar-right">
      <!-- Undo/Redo -->
      <button
        class="toolbar-btn"
        :disabled="!historyStore.canUndo"
        title="Undo (Cmd+Z)"
        @click="handleUndo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4"/>
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :disabled="!historyStore.canRedo"
        title="Redo (Cmd+Shift+Z)"
        @click="handleRedo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10H11a5 5 0 0 0-5 5v2M21 10l-4-4M21 10l-4 4"/>
        </svg>
      </button>

      <div class="toolbar-divider"></div>

      <!-- Cancel -->
      <button
        v-if="canvasStore.hasPendingChanges"
        class="toolbar-btn cancel"
        title="Cancel"
        @click="handleCancel"
      >
        Cancel
      </button>

      <!-- Confirm -->
      <button
        v-if="canvasStore.hasPendingChanges"
        class="toolbar-btn confirm"
        title="Confirm Changes"
        @click="handleConfirm"
      >
        Confirm
      </button>

      <!-- Close -->
      <button class="toolbar-btn close" title="Close Overlay" @click="handleClose">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  font-size: 13px;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #fef2f2;
  color: #dc2626;
}

.connection-status.connected {
  background: #f0fdf4;
  color: #16a34a;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-dot::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: inherit;
  animation: pulse 2s infinite;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.element-tag {
  font-weight: 600;
  color: #0f172a;
}

.element-path {
  font-size: 11px;
  color: #64748b;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
}

.pending-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1s infinite;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
}

.toolbar-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.confirm {
  background: #3b82f6;
  color: white;
}

.toolbar-btn.confirm:hover {
  background: #2563eb;
}

.toolbar-btn.cancel {
  background: #fee2e2;
  color: #dc2626;
}

.toolbar-btn.cancel:hover {
  background: #fecaca;
}

.toolbar-btn.close {
  padding: 6px;
  background: transparent;
}

.toolbar-btn.close:hover {
  background: #fee2e2;
  color: #dc2626;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
