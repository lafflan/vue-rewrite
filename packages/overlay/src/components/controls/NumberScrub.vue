<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number | string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}>(), {
  unit: 'px',
  step: 1,
});

const emit = defineEmits<{
  (e: 'change', value: number | string): void;
}>();

const inputValue = ref(String(props.value));
const isDragging = ref(false);
const startX = ref(0);
const startValue = ref(0);

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  inputValue.value = target.value;
}

function handleBlur() {
  let num = parseFloat(inputValue.value);
  if (isNaN(num)) {
    inputValue.value = String(props.value);
    return;
  }
  if (props.min !== undefined) num = Math.max(props.min, num);
  if (props.max !== undefined) num = Math.min(props.max, num);
  inputValue.value = String(num);
  emit('change', num);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    (e.target as HTMLInputElement).blur();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    adjustValue(props.step);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    adjustValue(-props.step);
  }
}

function adjustValue(delta: number) {
  let num = parseFloat(inputValue.value);
  if (isNaN(num)) num = 0;
  num = Math.max(props.min ?? -Infinity, Math.min(props.max ?? Infinity, num + delta));
  inputValue.value = String(num);
  emit('change', num);
}

function handleMouseDown(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    isDragging.value = true;
    startX.value = e.clientX;
    startValue.value = parseFloat(inputValue.value) || 0;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const delta = (e.clientX - startX.value) * props.step;
  const newValue = startValue.value + delta;
  inputValue.value = String(Math.round(newValue));
  emit('change', newValue);
}

function handleMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.body.style.cursor = '';
}
</script>

<template>
  <div class="number-scrub" :class="{ dragging: isDragging }">
    <input
      type="text"
      :value="inputValue"
      @input="handleInput"
      @blur="handleBlur"
      @keydown="handleKeyDown"
      @mousedown="handleMouseDown"
    />
    <span v-if="unit !== 'auto'" class="unit">{{ unit }}</span>
  </div>
</template>

<style scoped>
.number-scrub {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  transition: all 150ms ease;
}

.number-scrub:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: white;
}

.number-scrub.dragging {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  background: white;
}

input {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 7px 10px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  color: #0f172a;
  cursor: ew-resize;
  text-align: center;
}

input:focus {
  outline: none;
  cursor: text;
}

.unit {
  padding-right: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}
</style>
