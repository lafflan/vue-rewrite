<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCanvasStore } from '../stores/canvas';
import { useHistoryStore } from '../stores/history';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const canvasStore = useCanvasStore();
const historyStore = useHistoryStore();

const recentActions = computed(() => {
  return historyStore.undoStack.slice(-10).reverse();
});

function formatActionType(type: string): string {
  const labels: Record<string, string> = {
    move: 'Moved element',
    clone: 'Duplicated element',
    delete: 'Deleted element',
    'property-change': 'Changed property',
    'text-change': 'Edited text',
  };
  return labels[type] || type;
}

function handleRevert(index: number) {
  // Revert specific action
  const action = historyStore.undoStack[historyStore.undoStack.length - 1 - index];
  if (action) {
    historyStore.undo();
  }
}

function handleClearHistory() {
  historyStore.clear();
  canvasStore.clearAll();
}
</script>

<template>
  <div class="changelog-panel">
    <div class="panel-header">
      <h3>Changelog</h3>
      <button class="close-btn" @click="emit('close')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="panel-content">
      <div v-if="recentActions.length === 0" class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p>No changes yet</p>
        <span>Changes you make will appear here</span>
      </div>

      <div v-else class="changelog-list">
        <div
          v-for="(action, index) in recentActions"
          :key="index"
          class="changelog-entry"
        >
          <div class="entry-icon" :class="action.type">
            <svg v-if="action.type === 'move'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
            </svg>
            <svg v-else-if="action.type === 'clone'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="8" y="8" width="12" height="12" rx="2"/>
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
            </svg>
            <svg v-else-if="action.type === 'delete'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
          </div>
          <div class="entry-content">
            <span class="entry-type">{{ formatActionType(action.type) }}</span>
            <span class="entry-target">{{ action.targetId }}</span>
          </div>
          <button class="revert-btn" title="Revert" @click="handleRevert(index)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="recentActions.length > 0" class="panel-footer">
      <button class="clear-btn" @click="handleClearHistory">Clear All</button>
    </div>
  </div>
</template>

<style scoped>
.changelog-panel {
  position: fixed;
  left: 68px;
  top: 16px;
  bottom: 80px;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
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
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  text-align: center;
}

.empty-state p {
  margin: 8px 0 4px;
  font-weight: 500;
  color: #64748b;
}

.empty-state span {
  font-size: 12px;
}

.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.changelog-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: #f8fafc;
}

.changelog-entry:hover {
  background: #f1f5f9;
}

.entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #475569;
}

.entry-icon.move {
  background: #dbeafe;
  color: #2563eb;
}

.entry-icon.clone {
  background: #dcfce7;
  color: #16a34a;
}

.entry-icon.delete {
  background: #fee2e2;
  color: #dc2626;
}

.entry-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.entry-type {
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
}

.entry-target {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.revert-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms;
}

.changelog-entry:hover .revert-btn {
  opacity: 1;
}

.revert-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
}

.clear-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.clear-btn:hover {
  background: #fecaca;
}
</style>
