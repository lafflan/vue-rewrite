<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { usePropertiesStore } from '../stores/properties';

const propsStore = usePropertiesStore();

const sections = ref({
  inline: true,
  rules: true,
  classList: true,
});

const newClassInput = ref('');
const editingProperty = ref<string | null>(null);
const editingValue = ref('');
const isAddingProperty = ref(false);
const newPropertyName = ref('');

// 直接引用输入框元素，避免 querySelector
const propNameInput = ref<HTMLInputElement | null>(null);
const propValueInput = ref<HTMLInputElement | null>(null);

function toggleSection(key: keyof typeof sections.value) {
  sections.value[key] = !sections.value[key];
}

// Inline styles - 使用 store 的 inlineStyles ref 直接响应式更新
const inlineStyles = computed(() => propsStore.inlineStyles);

function startEditProperty(prop: string, value: string) {
  editingProperty.value = prop;
  editingValue.value = value;
}

function finishEditProperty() {
  if (editingProperty.value) {
    propsStore.updateInlineStyleProperty(editingProperty.value, editingValue.value);
    editingProperty.value = null;
    editingValue.value = '';
  }
}

function removeInlineProperty(prop: string) {
  propsStore.updateInlineStyleProperty(prop, '');
}

function addInlineProperty() {
  isAddingProperty.value = true;
  newPropertyName.value = '';
  editingValue.value = '';
  nextTick(() => {
    propNameInput.value?.focus();
  });
}

function focusValue() {
  nextTick(() => {
    propValueInput.value?.focus();
  });
}

function finishAddProperty() {
  if (newPropertyName.value.trim() && editingValue.value.trim()) {
    propsStore.updateInlineStyleProperty(newPropertyName.value.trim(), editingValue.value.trim());
  }
  isAddingProperty.value = false;
  newPropertyName.value = '';
  editingValue.value = '';
}

function cancelAddProperty(e) {
  e.stopPropagation();
  e.preventDefault();
  isAddingProperty.value = false;
  newPropertyName.value = '';
  editingValue.value = '';
}

// CSS Rules
const cssRules = computed(() => propsStore.getMatchedCSSRules());

// Class list (own only, no inherit)
const ownClasses = computed(() => propsStore.getOwnClasses());

function removeClass(cls: string) {
  const newList = propsStore.classList.filter((c) => c !== cls);
  propsStore.updateClassList(newList);
}

function addClassFromInput() {
  const cls = newClassInput.value.trim();
  if (!cls || propsStore.classList.includes(cls)) {
    newClassInput.value = '';
    return;
  }
  propsStore.updateClassList([...propsStore.classList, cls]);
  newClassInput.value = '';
}

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') addClassFromInput();
  else if (e.key === 'Escape') newClassInput.value = '';
}

// Format source path to show file:line
function formatSource(source: string): string {
  if (source === 'inline' || !source) return '';
  try {
    const url = new URL(source);
    return url.pathname.split('/').pop() || source;
  } catch {
    return source;
  }
}
</script>

<template>
  <div class="styles-panel">
    <!-- Class List Section -->
    <div class="section">
      <button class="section-header" @click="toggleSection('classList')">
        <span class="section-title">
          <svg class="expand-icon" :class="{ collapsed: !sections.classList }" width="10" height="10"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
          Class list
        </span>
        <span v-if="ownClasses.length > 0" class="section-count">
          {{ ownClasses.length }}
        </span>
      </button>

      <div v-show="sections.classList" class="section-content">
        <div class="class-tokens">
          <span v-for="cls in ownClasses" :key="cls" class="class-token">
            {{ cls }}
            <button class="remove-class" @click="removeClass(cls)" title="Remove class">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span v-if="ownClasses.length === 0" class="no-classes">No classes</span>
        </div>
        <div class="class-input-row">
          <input v-model="newClassInput" class="class-input" placeholder="Add class…" @keydown="handleInputKeydown"
            @blur="addClassFromInput" />
          <button class="add-class-btn" @click="addClassFromInput">+</button>
        </div>
      </div>
    </div>

    <!-- Inline Styles Section: element.style -->
    <div class="section">
      <button class="section-header" @click="toggleSection('inline')">
        <span class="section-title">
          <svg class="expand-icon" :class="{ collapsed: !sections.inline }" width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
          element.style
        </span>
        <span v-if="Object.keys(inlineStyles).length > 0" class="section-count">
          {{ Object.keys(inlineStyles).length }}
        </span>
      </button>

      <div v-show="sections.inline" class="section-content">
        <template v-if="Object.keys(inlineStyles).length > 0">
          <div v-for="(value, prop) in inlineStyles" :key="prop" class="style-row">
            <span class="prop-name">{{ prop }}:</span>
            <template v-if="editingProperty === prop">
              <input v-model="editingValue" class="prop-input" @blur="finishEditProperty"
                @keydown.enter="finishEditProperty" @keydown.escape="editingProperty = null" autofocus />
            </template>
            <template v-else>
              <span class="prop-value" @dblclick="startEditProperty(prop, value)">{{ value }};</span>
            </template>
            <button class="remove-btn" @click="removeInlineProperty(prop)" title="Remove">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </template>
        <div v-else class="empty-message">No inline styles</div>
        <!-- Add new property row -->
        <div v-if="isAddingProperty" class="add-property-row">
          <input ref="propNameInput" v-model="newPropertyName" class="prop-input prop-name-input" placeholder="property"
            @keydown.enter="focusValue" @keydown.escape="cancelAddProperty" />
          <span class="prop-colon">:</span>
          <input ref="propValueInput" v-model="editingValue" class="prop-input" placeholder="value" @keydown.enter="finishAddProperty"
            @keydown.escape="cancelAddProperty" />
          <button class="add-confirm-btn" @click="finishAddProperty" title="Confirm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <button class="add-cancel-btn" @click="cancelAddProperty" title="Cancel">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button v-else class="add-btn" @click="addInlineProperty">+ Add property</button>
      </div>
    </div>

    <!-- CSS Rules Section -->
    <div class="section">
      <button class="section-header" @click="toggleSection('rules')">
        <span class="section-title">
          <svg class="expand-icon" :class="{ collapsed: !sections.rules }" width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
          Matched CSS Rules
        </span>
        <span v-if="cssRules.length > 0" class="section-count">
          {{ cssRules.length }}
        </span>
      </button>

      <div v-show="sections.rules" class="section-content">
        <template v-if="cssRules.length > 0">
          <div v-for="(rule, idx) in cssRules" :key="idx" class="rule-group">
            <div class="rule-header">
              <span class="rule-selector">{{ rule.selector }}</span>
              <span v-if="formatSource(rule.source)" class="rule-source">
                {{ formatSource(rule.source) }}
              </span>
              <span v-if="rule.inherited" class="inherited-badge">inherited</span>
            </div>
            <div v-for="(value, prop) in rule.styles" :key="prop" class="style-row">
              <span class="prop-name">{{ prop }}:</span>
              <span class="prop-value">{{ value }};</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-message">No matching CSS rules from src</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Chrome DevTools Styles Panel Design */
.styles-panel {
  --bg-primary: #ffffff;
  --bg-secondary: #fafbfc;
  --bg-tertiary: #f8fafc;
  --border-subtle: #e5e7eb;
  --border-default: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent-cyan: #0891b2;
  --accent-blue: #2563eb;
  --accent-purple: #7c3aed;
  --accent-red: #ef4444;
  --accent-red-bg: #fef2f2;

  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
}

.section {
  border-bottom: 1px solid var(--border-subtle);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease;
}

.section-header:hover {
  background: rgba(59, 130, 246, 0.05);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.expand-icon {
  color: var(--text-muted);
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-icon.collapsed {
  transform: rotate(-90deg);
}

.section-count {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 10px;
}

.section-content {
  padding: 6px 12px 14px;
  /* max-height: 280px; */
  overflow-y: auto;
}

.style-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 11.5px;
  line-height: 1.6;
  min-height: 24px;
}

.style-row:hover .remove-btn {
  opacity: 1;
}

.prop-name {
  color: var(--accent-cyan);
  font-weight: 500;
  flex-shrink: 0;
}

.prop-colon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.prop-value {
  color: var(--text-primary);
  cursor: text;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
  border-radius: 2px;
  transition: background 100ms ease;
}

.prop-value:hover {
  background: rgba(59, 130, 246, 0.08);
}

.prop-input {
  flex: 1;
  min-width: 60px;
  border: 1px solid var(--accent-blue);
  border-radius: 3px;
  padding: 2px 6px;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  background: white;
  color: var(--text-primary);
}

.prop-input:focus {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.prop-name-input {
  max-width: 80px;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  opacity: 0;
  transition: all 100ms ease;
  border-radius: 3px;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: var(--accent-red);
  background: var(--accent-red-bg);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  margin-top: 6px;
  border: 1px dashed var(--border-default);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 120ms ease;
}

.add-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: rgba(37, 99, 235, 0.04);
}

/* Add property row */
.add-property-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 4px 0;
}

.add-confirm-btn,
.add-cancel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 3px;
  transition: all 100ms ease;
  flex-shrink: 0;
}

.add-confirm-btn {
  color: #16a34a;
}

.add-confirm-btn:hover {
  background: #dcfce7;
}

.add-cancel-btn {
  color: var(--text-muted);
}

.add-cancel-btn:hover {
  color: var(--accent-red);
  background: var(--accent-red-bg);
}

/* CSS Rules */
.rule-group {
  margin-bottom: 0;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border-radius: 0;
  border-bottom: 1px solid var(--border-subtle);
}

.rule-group::after {
  content: ' }';
}

.rule-group:first-child {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.rule-group:last-child {
  margin-bottom: 0;
  border-bottom: none;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.rule-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rule-selector {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-blue);
  background: rgba(37, 99, 235, 0.06);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(37, 99, 235, 0.15);
  display: inline-block;
  margin-bottom: 4px;
}

.rule-selector::after {
  content: ' {';
}

.rule-group .style-row {
  padding-left: 8px;
  border-left: 2px solid var(--border-subtle);
  margin-left: 2px;
}

.rule-source {
  font-size: 10px;
  color: var(--text-muted);
}

.inherited-badge {
  font-size: 9px;
  font-weight: 500;
  color: var(--accent-purple);
  background: #f5f3ff;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px dashed #c4b5fd;
  font-style: italic;
}

.empty-message {
  font-size: 11px;
  color: var(--text-muted);
  padding: 8px 0;
}

/* Class tokens */
.class-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  min-height: 28px;
  padding: 4px 0;
}

.class-token {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-secondary);
  transition: all 120ms ease;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.02);
}

.class-token:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.remove-class {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  line-height: 1;
  flex-shrink: 0;
  transition: color 100ms ease;
}

.remove-class:hover {
  color: var(--accent-red);
}

.no-classes {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 0;
}

.class-input-row {
  display: flex;
  gap: 6px;
}

.class-input {
  flex: 1;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 11px;
  outline: none;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 120ms ease;
}

.class-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.class-input::placeholder {
  color: var(--text-muted);
}

.add-class-btn {
  padding: 6px 10px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--bg-primary);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  transition: all 120ms ease;
}

.add-class-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: rgba(37, 99, 235, 0.04);
}
</style>
