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
  border-radius: 6px;
  padding: 2px;
}

.segment {
  flex: 1;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 150ms;
}

.segment:hover:not(.active) {
  color: #0f172a;
}

.segment.active {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
