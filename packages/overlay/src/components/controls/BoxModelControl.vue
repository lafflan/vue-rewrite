<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  prop: 'padding' | 'margin';
}>();

const emit = defineEmits<{
  (e: 'change', value: { top: number; right: number; bottom: number; left: number }): void;
}>();

const values = ref({ top: 0, right: 0, bottom: 0, left: 0 });
const isLinked = ref(true);

function updateValue(side: keyof typeof values.value, value: number) {
  values.value[side] = value;
  emit('change', values.value);

  if (isLinked.value) {
    const newValues = { top: value, right: value, bottom: value, left: value };
    values.value = newValues;
    emit('change', newValues);
  }
}

function toggleLink() {
  isLinked.value = !isLinked.value;
}
</script>

<template>
  <div class="box-model-control">
    <div class="box-model-grid">
      <div class="box-model-top">
        <input
          type="number"
          :value="values.top"
          min="0"
          @input="updateValue('top', parseInt(($event.target as HTMLInputElement).value) || 0)"
        />
      </div>
      <div class="box-model-middle">
        <button
          class="link-btn"
          :class="{ active: isLinked }"
          @click="toggleLink"
          title="Link values"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="isLinked" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path v-else d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          </svg>
        </button>
      </div>
      <div class="box-model-right">
        <input
          type="number"
          :value="values.right"
          min="0"
          @input="updateValue('right', parseInt(($event.target as HTMLInputElement).value) || 0)"
        />
      </div>
      <div class="box-model-bottom">
        <input
          type="number"
          :value="values.bottom"
          min="0"
          @input="updateValue('bottom', parseInt(($event.target as HTMLInputElement).value) || 0)"
        />
      </div>
      <div class="box-model-left">
        <input
          type="number"
          :value="values.left"
          min="0"
          @input="updateValue('left', parseInt(($event.target as HTMLInputElement).value) || 0)"
        />
      </div>
    </div>

    <div class="box-model-preview">
      <div
        class="preview-box"
        :style="{
          paddingTop: `${values.top}px`,
          paddingRight: `${values.right}px`,
          paddingBottom: `${values.bottom}px`,
          paddingLeft: `${values.left}px`,
        }"
      >
        <div
          class="preview-margin"
          :style="{
            marginTop: `${-values.top}px`,
            marginRight: `${-values.right}px`,
            marginBottom: `${-values.bottom}px`,
            marginLeft: `${-values.left}px`,
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.box-model-control {
  display: flex;
  gap: 16px;
  align-items: center;
}

.box-model-grid {
  display: grid;
  grid-template-columns: auto auto auto;
  grid-template-rows: auto auto auto;
  gap: 4px;
  width: 130px;
}

.box-model-top {
  grid-column: 2;
  grid-row: 1;
}

.box-model-right {
  grid-column: 3;
  grid-row: 2;
}

.box-model-bottom {
  grid-column: 2;
  grid-row: 3;
}

.box-model-left {
  grid-column: 1;
  grid-row: 2;
}

.box-model-middle {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

input[type="number"] {
  width: 38px;
  padding: 5px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 11px;
  text-align: center;
  font-family: 'SF Mono', Monaco, monospace;
  background: #f8fafc;
  color: #0f172a;
  transition: all 150ms ease;
}

input[type="number"]:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  transition: all 150ms ease;
}

.link-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.link-btn.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.box-model-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
}

.preview-box {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  transition: all 150ms ease;
}

.preview-margin {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  height: 26px;
  border: 1px solid #f59e0b;
  border-radius: 3px;
}
</style>
