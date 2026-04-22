<script setup lang="ts">
interface Option {
  value: string;
  label: string;
  icon?: string;
}

defineProps<{
  options: Option[];
  value: string;
}>();

const emit = defineEmits<{
  (e: 'change', value: string): void;
}>();

function select(value: string) {
  emit('change', value);
}
</script>

<template>
  <div class="segmented-control">
    <button
      v-for="option in options"
      :key="option.value"
      class="segment"
      :class="{ active: option.value === value }"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented-control {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.segment {
  flex: 1;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.segment:hover:not(.active) {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.5);
}

.segment.active {
  background: white;
  color: #3b82f6;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(59, 130, 246, 0.1);
}
</style>
