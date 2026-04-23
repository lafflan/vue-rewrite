<script setup lang="ts">
import { ref, computed } from 'vue';
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

function toggleSection(key: keyof typeof sections.value) {
  sections.value[key] = !sections.value[key];
}

// Inline styles
const inlineStyles = computed(() => propsStore.getInlineStyles());

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

// CSS Rules
const cssRules = computed(() => propsStore.getMatchedCSSRules());

// Class list with inherit
const classListWithInherit = computed(() => propsStore.getClassListWithInherit());

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
    <!-- Inline Styles Section: element.style -->
    <div class="section">
      <button class="section-header" @click="toggleSection('inline')">
        <span class="section-title">
          <svg
            class="expand-icon"
            :class="{ collapsed: !sections.inline }"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6"/>
          </svg>
          element.style
        </span>
        <span v-if="Object.keys(inlineStyles).length > 0" class="section-count">
          {{ Object.keys(inlineStyles).length }}
        </span>
      </button>

      <div v-show="sections.inline" class="section-content">
        <template v-if="Object.keys(inlineStyles).length > 0">
          <div
            v-for="(value, prop) in inlineStyles"
            :key="prop"
            class="style-row"
          >
            <span class="prop-name">{{ prop }}:</span>
            <template v-if="editingProperty === prop">
              <input
                v-model="editingValue"
                class="prop-input"
                @blur="finishEditProperty"
                @keydown.enter="finishEditProperty"
                @keydown.escape="editingProperty = null"
                autofocus
              />
            </template>
            <template v-else>
              <span class="prop-value" @dblclick="startEditProperty(prop, value)">{{ value }}</span>;
            </template>
            <button class="remove-btn" @click="removeInlineProperty(prop)" title="Remove">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </template>
        <div v-else class="empty-message">No inline styles</div>
        <button class="add-btn">+ Add property</button>
      </div>
    </div>

    <!-- CSS Rules Section -->
    <div class="section">
      <button class="section-header" @click="toggleSection('rules')">
        <span class="section-title">
          <svg
            class="expand-icon"
            :class="{ collapsed: !sections.rules }"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6"/>
          </svg>
          Matched CSS Rules
        </span>
        <span v-if="cssRules.length > 0" class="section-count">
          {{ cssRules.length }}
        </span>
      </button>

      <div v-show="sections.rules" class="section-content">
        <template v-if="cssRules.length > 0">
          <div
            v-for="(rule, idx) in cssRules"
            :key="idx"
            class="rule-group"
          >
            <div class="rule-header">
              <span class="rule-selector">{{ rule.selector }}</span>
              <span v-if="formatSource(rule.source)" class="rule-source">
                {{ formatSource(rule.source) }}
              </span>
              <span v-if="rule.inherited" class="inherited-badge">inherited</span>
            </div>
            <div
              v-for="(value, prop) in rule.styles"
              :key="prop"
              class="style-row"
            >
              <span class="prop-name">{{ prop }}:</span>
              <span class="prop-value">{{ value }}</span>;
            </div>
          </div>
        </template>
        <div v-else class="empty-message">No matching CSS rules from src</div>
      </div>
    </div>

    <!-- Class List Section -->
    <div class="section">
      <button class="section-header" @click="toggleSection('classList')">
        <span class="section-title">
          <svg
            class="expand-icon"
            :class="{ collapsed: !sections.classList }"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6"/>
          </svg>
          Class list
        </span>
        <span v-if="classListWithInherit.length > 0" class="section-count">
          {{ classListWithInherit.length }}
        </span>
      </button>

      <div v-show="sections.classList" class="section-content">
        <div class="class-tokens">
          <span
            v-for="cls in classListWithInherit"
            :key="cls.name"
            class="class-token"
            :class="{ inherited: cls.inherited }"
          >
            {{ cls.name }}
            <button
              v-if="!cls.inherited"
              class="remove-class"
              @click="removeClass(cls.name)"
              title="Remove class"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </span>
          <span v-if="classListWithInherit.length === 0" class="no-classes">No classes</span>
        </div>
        <div class="class-input-row">
          <input
            v-model="newClassInput"
            class="class-input"
            placeholder="Add class…"
            @keydown="handleInputKeydown"
            @blur="addClassFromInput"
          />
          <button class="add-class-btn" @click="addClassFromInput">+</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.styles-panel {
  font-size: 12px;
  color: #0f172a;
}

.section {
  border-bottom: 1px solid #f1f5f9;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 150ms ease;
}

.section-header:hover {
  background: rgba(59, 130, 246, 0.04);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
}

.expand-icon {
  color: #64748b;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-icon.collapsed {
  transform: rotate(-90deg);
}

.section-count {
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 10px;
}

.section-content {
  padding: 4px 16px 16px;
}

.style-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 11px;
  line-height: 1.5;
}

.style-row:hover .remove-btn {
  opacity: 1;
}

.prop-name {
  color: #0891b2;
}

.prop-value {
  color: #0f172a;
  cursor: text;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prop-value:hover {
  background: rgba(59, 130, 246, 0.08);
  border-radius: 2px;
}

.prop-input {
  flex: 1;
  min-width: 0;
  border: 1px solid #3b82f6;
  border-radius: 2px;
  padding: 1px 4px;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  background: white;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
  opacity: 0;
  transition: opacity 150ms ease;
  border-radius: 2px;
}

.remove-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  margin-top: 8px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 150ms ease;
}

.add-btn:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.rule-group {
  margin-bottom: 12px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
}

.rule-group:last-child {
  margin-bottom: 0;
}

.rule-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}

.rule-selector {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
}

.rule-source {
  font-size: 10px;
  color: #94a3b8;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.inherited-badge {
  font-size: 9px;
  font-weight: 500;
  color: #7c3aed;
  background: #ede9fe;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.empty-message {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
  padding: 8px 0;
}

.class-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
  min-height: 26px;
}

.class-token {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  color: #2563eb;
  transition: all 150ms ease;
}

.class-token.inherited {
  background: transparent;
  border: 1px dashed #c4b5fd;
  color: #7c3aed;
}

.class-token:hover {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  transform: translateY(-1px);
}

.class-token.inherited:hover {
  background: #ede9fe;
  transform: none;
}

.remove-class {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #93c5fd;
  line-height: 1;
  flex-shrink: 0;
  transition: color 150ms ease;
}

.remove-class:hover {
  color: #ef4444;
}

.no-classes {
  font-size: 11px;
  color: #cbd5e1;
  font-style: italic;
}

.class-input-row {
  display: flex;
  gap: 6px;
}

.class-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  outline: none;
  color: #0f172a;
  background: white;
  transition: all 150ms ease;
}

.class-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.add-class-btn {
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
  transition: all 150ms ease;
}

.add-class-btn:hover {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}
</style>
