<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(defineProps<{
  value?: string;
}>(), {
  value: '#ffffff',
});

const emit = defineEmits<{
  (e: 'change', value: string): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const showPicker = ref(false);

const displayColor = computed(() => {
  return props.value || '#ffffff';
});

function openPicker() {
  inputRef.value?.click();
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit('change', target.value);
}

function handleClick() {
  showPicker.value = !showPicker.value;
}
</script>

<template>
  <div class="color-swatch" @click="openPicker">
    <div class="swatch-preview" :style="{ backgroundColor: displayColor }">
      <input
        ref="inputRef"
        type="color"
        :value="displayColor"
        class="hidden-input"
        @input="handleInput"
      />
    </div>
    <input
      type="text"
      :value="displayColor"
      class="color-input"
      @click.stop
      @change="handleInput"
    />
  </div>
</template>

<style scoped>
.color-swatch {
  display: flex;
  gap: 10px;
  align-items: center;
}

.swatch-preview {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid white;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: all 150ms ease;
}

.swatch-preview:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.swatch-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, #ddd 25%, transparent 25%),
              linear-gradient(-45deg, #ddd 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ddd 75%),
              linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  z-index: -1;
}

.hidden-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  color: #0f172a;
  background: #f8fafc;
  transition: all 150ms ease;
}

.color-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
