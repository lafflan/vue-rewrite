import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CanvasUndoAction } from '@vue-rewrite/shared';

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface MoveEntry {
  id: string;
  originalRect: DOMRect;
  currentRect: DOMRect;
  deltaX: number;
  deltaY: number;
  parentId: string;
  index: number;
}

export interface CloneEntry {
  id: string;
  cloneId: string;
  parentId: string;
  index: number;
  originalRect: DOMRect;
}

export interface DeleteEntry {
  id: string;
  parentId: string;
  index: number;
  snapshot: string;
  rect: DOMRect;
}

export interface Annotation {
  id: string;
  type: 'text' | 'color-badge' | 'text-edit';
  targetId: string;
  content: string;
  color?: string;
  position: { x: number; y: number };
}

export const useCanvasStore = defineStore('canvas', () => {
  // Transform state (zoom/pan)
  const transform = ref<CanvasTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Element state
  const moves = ref<Map<string, MoveEntry>>(new Map());
  const clones = ref<Map<string, CloneEntry>>(new Map());
  const deletes = ref<Map<string, DeleteEntry>>(new Map());
  const annotations = ref<Annotation[]>([]);

  // Batch operations
  const pendingOperations = ref<CanvasUndoAction[]>([]);
  const isBatching = ref(false);

  // Computed
  const hasPendingChanges = computed(() => pendingOperations.value.length > 0);
  const pendingChangesCount = computed(() => pendingOperations.value.length);

  // Transform actions
  function setTransform(t: Partial<CanvasTransform>) {
    transform.value = { ...transform.value, ...t };
  }

  function zoom(delta: number, centerX: number, centerY: number) {
    const oldScale = transform.value.scale;
    const newScale = Math.min(Math.max(oldScale + delta, 0.1), 5);

    // Adjust position to zoom towards center
    const scaleRatio = newScale / oldScale;
    transform.value = {
      x: centerX - (centerX - transform.value.x) * scaleRatio,
      y: centerY - (centerY - transform.value.y) * scaleRatio,
      scale: newScale,
    };
  }

  function pan(dx: number, dy: number) {
    transform.value = {
      ...transform.value,
      x: transform.value.x + dx,
      y: transform.value.y + dy,
    };
  }

  function resetTransform() {
    transform.value = { x: 0, y: 0, scale: 1 };
  }

  // Move operations
  function addMove(entry: MoveEntry) {
    moves.value.set(entry.id, entry);
  }

  function removeMove(id: string) {
    moves.value.delete(id);
  }

  function getMove(id: string): MoveEntry | undefined {
    return moves.value.get(id);
  }

  function clearMoves() {
    moves.value.clear();
  }

  // Clone operations
  function addClone(entry: CloneEntry) {
    clones.value.set(entry.id, entry);
  }

  function removeClone(id: string) {
    clones.value.delete(id);
  }

  function clearClones() {
    clones.value.clear();
  }

  // Delete operations
  function addDelete(entry: DeleteEntry) {
    deletes.value.set(entry.id, entry);
  }

  function removeDelete(id: string) {
    deletes.value.delete(id);
  }

  function clearDeletes() {
    deletes.value.clear();
  }

  // Annotation operations
  function addAnnotation(annotation: Annotation) {
    annotations.value.push(annotation);
  }

  function removeAnnotation(id: string) {
    annotations.value = annotations.value.filter((a) => a.id !== id);
  }

  function clearAnnotations() {
    annotations.value = [];
  }

  // Batch operations
  function startBatch() {
    isBatching.value = true;
    pendingOperations.value = [];
  }

  function addPendingOperation(op: CanvasUndoAction) {
    pendingOperations.value.push(op);
  }

  function commitBatch() {
    isBatching.value = false;
    // Operations are already tracked, just clear the batch flag
  }

  function clearPendingOperations() {
    pendingOperations.value = [];
    isBatching.value = false;
  }

  // Clear all state
  function clearAll() {
    clearMoves();
    clearClones();
    clearDeletes();
    clearAnnotations();
    clearPendingOperations();
    resetTransform();
  }

  return {
    // State
    transform,
    moves,
    clones,
    deletes,
    annotations,
    pendingOperations,
    isBatching,

    // Computed
    hasPendingChanges,
    pendingChangesCount,

    // Transform actions
    setTransform,
    zoom,
    pan,
    resetTransform,

    // Move operations
    addMove,
    removeMove,
    getMove,
    clearMoves,

    // Clone operations
    addClone,
    removeClone,
    clearClones,

    // Delete operations
    addDelete,
    removeDelete,
    clearDeletes,

    // Annotation operations
    addAnnotation,
    removeAnnotation,
    clearAnnotations,

    // Batch operations
    startBatch,
    addPendingOperation,
    commitBatch,
    clearPendingOperations,

    // Clear
    clearAll,
  };
});
