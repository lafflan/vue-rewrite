<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropertyGroup } from '@vue-rewrite/shared';
import { usePropertiesStore } from '../stores/properties';
import NumberScrub from './controls/NumberScrub.vue';
import SegmentedControl from './controls/SegmentedControl.vue';
import ColorSwatch from './controls/ColorSwatch.vue';
import BoxModelControl from './controls/BoxModelControl.vue';

defineProps<{
  group: PropertyGroup;
  label: string;
}>();

const propsStore = usePropertiesStore();

const isExpanded = ref(true);

function toggle() {
  isExpanded.value = !isExpanded.value;
}

// Computed values from CSS
const displayValue = computed(() => {
  const v = propsStore.getCssValue('display');
  return v || 'block';
});
const paddingValue = computed(() => ({
  top: propsStore.getCssValue('padding-top'),
  right: propsStore.getCssValue('padding-right'),
  bottom: propsStore.getCssValue('padding-bottom'),
  left: propsStore.getCssValue('padding-left'),
}));
const marginValue = computed(() => ({
  top: propsStore.getCssValue('margin-top'),
  right: propsStore.getCssValue('margin-right'),
  bottom: propsStore.getCssValue('margin-bottom'),
  left: propsStore.getCssValue('margin-left'),
}));
const widthValue = computed(() => propsStore.getCssValue('width'));
const heightValue = computed(() => propsStore.getCssValue('height'));
const fontSizeValue = computed(() => propsStore.getCssValue('font-size'));
const fontWeightValue = computed(() => {
  const v = propsStore.getCssValue('font-weight');
  if (v === '400' || v === 'normal') return 'normal';
  if (v === '500') return 'medium';
  if (v === '600') return 'semibold';
  if (v === '700' || v === 'bold') return 'bold';
  return 'normal';
});
const textAlignValue = computed(() => propsStore.getCssValue('text-align') || 'left');
const bgColorValue = computed(() => propsStore.getCssValue('background-color') || '#ffffff');
const borderRadiusValue = computed(() => propsStore.getCssValue('border-radius'));
const borderWidthValue = computed(() => propsStore.getCssValue('border-width'));

// Change handlers
function onDisplayChange(value: string) {
  propsStore.updateDisplay(value);
}
function onPaddingChange(side: string, value: string) {
  propsStore.updateInlineStyle(`padding-${side}`, value);
}
function onMarginChange(side: string, value: string) {
  propsStore.updateInlineStyle(`margin-${side}`, value);
}
function onWidthChange(value: string) {
  propsStore.updateInlineStyle('width', value);
}
function onHeightChange(value: string) {
  propsStore.updateInlineStyle('height', value);
}
function onFontSizeChange(value: string) {
  propsStore.updateInlineStyle('font-size', value);
}
function onFontWeightChange(value: string) {
  propsStore.updateFontWeight(value);
}
function onTextAlignChange(value: string) {
  propsStore.updateTextAlign(value);
}
function onBgChange(value: string) {
  propsStore.updateBackgroundColor(value);
}
function onBorderRadiusChange(value: string) {
  propsStore.updateBorderRadius(value);
}
function onBorderWidthChange(value: string) {
  propsStore.updateBorderWidth(value);
}
</script>

<template>
  <div class="property-section" :class="{ collapsed: !isExpanded }">
    <button class="section-header" @click="toggle">
      <span class="section-title">{{ label }}</span>
      <svg
        class="expand-icon"
        :class="{ rotated: !isExpanded }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>

    <div v-show="isExpanded" class="section-content">
      <!-- Layout properties -->
      <template v-if="group === 'layout'">
        <div class="property-row">
          <label>Display</label>
          <SegmentedControl
            :options="[
              { value: 'block', label: 'Block' },
              { value: 'flex', label: 'Flex' },
              { value: 'grid', label: 'Grid' },
            ]"
            :value="displayValue"
            @change="onDisplayChange"
          />
        </div>
      </template>

      <!-- Spacing properties -->
      <template v-if="group === 'spacing'">
        <div class="property-row">
          <label>Padding</label>
          <BoxModelControl
            prop="padding"
            @change="(vals: {top: number; right: number; bottom: number; left: number}) => {
              onPaddingChange('top', String(vals.top) + 'px');
              onPaddingChange('right', String(vals.right) + 'px');
              onPaddingChange('bottom', String(vals.bottom) + 'px');
              onPaddingChange('left', String(vals.left) + 'px');
            }"
          />
        </div>
        <div class="property-row">
          <label>Margin</label>
          <BoxModelControl
            prop="margin"
            @change="(vals: {top: number; right: number; bottom: number; left: number}) => {
              onMarginChange('top', String(vals.top) + 'px');
              onMarginChange('right', String(vals.right) + 'px');
              onMarginChange('bottom', String(vals.bottom) + 'px');
              onMarginChange('left', String(vals.left) + 'px');
            }"
          />
        </div>
      </template>

      <!-- Size properties -->
      <template v-if="group === 'size'">
        <div class="property-row">
          <label>Width</label>
          <NumberScrub
            :value="widthValue"
            unit="px"
            :min="0"
            :max="2000"
            @change="onWidthChange"
          />
        </div>
        <div class="property-row">
          <label>Height</label>
          <NumberScrub
            :value="heightValue"
            unit="px"
            :min="0"
            :max="2000"
            @change="onHeightChange"
          />
        </div>
      </template>

      <!-- Typography properties -->
      <template v-if="group === 'typography'">
        <div class="property-row">
          <label>Font Size</label>
          <NumberScrub
            :value="fontSizeValue"
            unit="px"
            :min="8"
            :max="72"
            @change="onFontSizeChange"
          />
        </div>
        <div class="property-row">
          <label>Font Weight</label>
          <SegmentedControl
            :options="[
              { value: 'normal', label: 'Normal' },
              { value: 'medium', label: 'Medium' },
              { value: 'semibold', label: 'Semibold' },
              { value: 'bold', label: 'Bold' },
            ]"
            :value="fontWeightValue"
            @change="onFontWeightChange"
          />
        </div>
        <div class="property-row">
          <label>Text Align</label>
          <SegmentedControl
            :options="[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]"
            :value="textAlignValue"
            @change="onTextAlignChange"
          />
        </div>
      </template>

      <!-- Background properties -->
      <template v-if="group === 'background'">
        <div class="property-row">
          <label>Background</label>
          <ColorSwatch
            :value="bgColorValue"
            @change="onBgChange"
          />
        </div>
      </template>

      <!-- Border properties -->
      <template v-if="group === 'border'">
        <div class="property-row">
          <label>Radius</label>
          <NumberScrub
            :value="borderRadiusValue"
            unit="px"
            :min="0"
            :max="100"
            @change="onBorderRadiusChange"
          />
        </div>
        <div class="property-row">
          <label>Width</label>
          <NumberScrub
            :value="borderWidthValue"
            unit="px"
            :min="0"
            :max="20"
            @change="onBorderWidthChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.property-section {
  border-bottom: 1px solid #f1f5f9;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.section-header:hover {
  background: #f8fafc;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.expand-icon {
  color: #94a3b8;
  transition: transform 150ms;
}

.expand-icon.rotated {
  transform: rotate(-90deg);
}

.section-content {
  padding: 8px 16px 16px;
}

.property-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-row label {
  font-size: 12px;
  color: #475569;
}
</style>
