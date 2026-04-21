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
  gap: 8px;
  align-items: center;
}

.swatch-preview {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.swatch-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, #ccc 25%, transparent 25%),
              linear-gradient(-45deg, #ccc 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ccc 75%),
              linear-gradient(-45deg, transparent 75%, #ccc 75%);
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
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  color: #0f172a;
}

.color-input:focus {
  outline: none;
  border-color: #3b82f6;
}
</style>
