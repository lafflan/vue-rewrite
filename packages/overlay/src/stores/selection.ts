import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ComponentInfo, VueStructuralPath } from '@vue-rewrite/shared';

export const useSelectionStore = defineStore('selection', () => {
  // State
  const selectedId = ref<string | null>(null);
  const selectedComponent = ref<ComponentInfo | null>(null);
  const hoveredId = ref<string | null>(null);
  const multiSelectedIds = ref<Set<string>>(new Set());

  // Computed
  const hasSelection = computed(() => selectedId.value !== null);
  const hasMultiSelection = computed(() => multiSelectedIds.value.size > 0);
  const isSelected = (id: string) => selectedId.value === id;
  const isHovered = (id: string) => hoveredId.value === id;

  // Actions
  function select(id: string | null, component?: ComponentInfo) {
    selectedId.value = id;
    selectedComponent.value = component || null;
  }

  function hover(id: string | null) {
    hoveredId.value = id;
  }

  function addToMultiSelect(id: string) {
    multiSelectedIds.value.add(id);
  }

  function removeFromMultiSelect(id: string) {
    multiSelectedIds.value.delete(id);
  }

  function toggleMultiSelect(id: string) {
    if (multiSelectedIds.value.has(id)) {
      multiSelectedIds.value.delete(id);
    } else {
      multiSelectedIds.value.add(id);
    }
  }

  function clearMultiSelect() {
    multiSelectedIds.value.clear();
  }

  function clearSelection() {
    selectedId.value = null;
    selectedComponent.value = null;
    clearMultiSelect();
  }

  function clear() {
    clearSelection();
    hoveredId.value = null;
  }

  return {
    // State
    selectedId,
    selectedComponent,
    hoveredId,
    multiSelectedIds,

    // Computed
    hasSelection,
    hasMultiSelection,
    isSelected,
    isHovered,

    // Actions
    select,
    hover,
    addToMultiSelect,
    removeFromMultiSelect,
    toggleMultiSelect,
    clearMultiSelect,
    clearSelection,
    clear,
  };
});
