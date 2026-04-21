import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CanvasUndoAction } from '@vue-rewrite/shared';

const MAX_HISTORY_SIZE = 100;

export const useHistoryStore = defineStore('history', () => {
  // Undo/Redo stacks
  const undoStack = ref<CanvasUndoAction[]>([]);
  const redoStack = ref<CanvasUndoAction[]>([]);

  // Computed
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);
  const historyLength = computed(() => undoStack.value.length);

  // Actions
  function push(action: CanvasUndoAction) {
    undoStack.value.push(action);
    redoStack.value = []; // Clear redo stack on new action

    // Limit stack size
    if (undoStack.value.length > MAX_HISTORY_SIZE) {
      undoStack.value.shift();
    }
  }

  function pushBatch(actions: CanvasUndoAction[]) {
    actions.forEach((action) => push(action));
  }

  function undo(): CanvasUndoAction | null {
    const action = undoStack.value.pop();
    if (action) {
      redoStack.value.push(action);
      return action;
    }
    return null;
  }

  function redo(): CanvasUndoAction | null {
    const action = redoStack.value.pop();
    if (action) {
      undoStack.value.push(action);
      return action;
    }
    return null;
  }

  function getInverse(action: CanvasUndoAction): CanvasUndoAction {
    switch (action.type) {
      case 'move':
        return {
          type: 'move',
          targetId: action.targetId,
          fromParent: action.toParent,
          fromIndex: action.toIndex,
          toParent: action.fromParent,
          toIndex: action.fromIndex,
        };
      case 'clone':
        return { type: 'delete', targetId: action.cloneId, parentId: action.parentId, index: action.index, snapshot: '' };
      case 'delete':
        return { type: 'clone', targetId: action.targetId, cloneId: '', parentId: action.parentId, index: action.index, snapshot: action.snapshot };
      case 'property-change':
        return { type: 'property-change', targetId: action.targetId, property: action.property, oldValue: action.newValue, newValue: action.oldValue };
      case 'text-change':
        return { type: 'text-change', targetId: action.targetId, oldText: action.newText, newText: action.oldText };
      default:
        return action;
    }
  }

  function clear() {
    undoStack.value = [];
    redoStack.value = [];
  }

  return {
    // State
    undoStack,
    redoStack,

    // Computed
    canUndo,
    canRedo,
    historyLength,

    // Actions
    push,
    pushBatch,
    undo,
    redo,
    getInverse,
    clear,
  };
});
