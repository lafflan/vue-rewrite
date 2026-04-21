import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useSelectionStore } from './selection';
import type { TailwindTokenMap, VueStructuralPath, VuePathSegment } from '@vue-rewrite/shared';
import { bridge } from '../bridge';

/**
 * 从 DOM 元素向上遍历构建 path segments
 * 用于精确定位 template 中的嵌套元素
 */
function buildPathSegments(el: HTMLElement): VuePathSegment[] {
  const segments: VuePathSegment[] = [];
  let current: Element | null = el;

  while (current && current !== document.body) {
    // 找到带 data-vr-id 的元素才记录路径
    if (!current.hasAttribute('data-vr-id')) {
      current = current.parentElement;
      continue;
    }

    const tagName = current.tagName.toLowerCase();

    // 计算当前元素在兄弟节点中的索引
    let index = 0;
    let sibling = current.previousElementSibling;
    while (sibling) {
      // 只计算同标签名的兄弟节点
      if (sibling.tagName.toLowerCase() === tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    // 判断是否有 v-for、:key 等属性来确定 discriminator
    const hasVFor = current.hasAttribute('v-for') || current.getAttribute('v-for') !== null;
    const hasKey = current.hasAttribute(':key') || current.getAttribute(':key') !== null;

    let discriminator: VuePathSegment['discriminator'];
    if (hasVFor) {
      discriminator = { type: 'v-for' };
    } else if (hasKey) {
      discriminator = { type: 'key' };
    } else {
      discriminator = { type: 'index' };
    }

    segments.unshift({
      name: tagName,
      discriminator,
      classHint: [],
    });

    current = current.parentElement;
  }

  return segments;
}

// Tailwind class prefix → CSS 属性对照
const TAILWIND_PREFIX_CSS_MAP: Record<string, string> = {
  'p': 'padding',
  'px': 'padding-inline',
  'py': 'padding-block',
  'pt': 'padding-top',
  'pr': 'padding-right',
  'pb': 'padding-bottom',
  'pl': 'padding-left',
  'm': 'margin',
  'mx': 'margin-inline',
  'my': 'margin-block',
  'mt': 'margin-top',
  'mr': 'margin-right',
  'mb': 'margin-bottom',
  'ml': 'margin-left',
  'w': 'width',
  'h': 'height',
  'max-w': 'max-width',
  'max-h': 'max-height',
  'min-w': 'min-width',
  'min-h': 'min-height',
  'text': 'font-size',
  'font': 'font-weight',
  'leading': 'line-height',
  'rounded': 'border-radius',
  'border': 'border-width',
  'gap': 'gap',
  'flex': 'flex',
  'grid': 'display',
};

export const usePropertiesStore = defineStore('properties', () => {
  const selectionStore = useSelectionStore();

  const tailwindTokens = ref<TailwindTokenMap | null>(null);
  const selectedElement = ref<HTMLElement | null>(null);
  const computedStyles = ref<CSSStyleDeclaration | null>(null);
  const classList = ref<string[]>([]);

  // 选中元素变化时刷新 CSS 信息
  watch(
    () => selectionStore.selectedId,
    (id) => {
      if (!id) {
        selectedElement.value = null;
        computedStyles.value = null;
        classList.value = [];
        return;
      }

      const el = document.querySelector(`[data-vr-id="${id}"]`);
      if (el instanceof HTMLElement) {
        selectedElement.value = el;
        computedStyles.value = window.getComputedStyle(el);
        classList.value = Array.from(el.classList);
      }
    }
  );

  function setTailwindTokens(tokens: TailwindTokenMap) {
    tailwindTokens.value = tokens;
  }

  /** 从 computed styles 读取某个 CSS 属性的值 */
  function getCssValue(cssProperty: string): string {
    return computedStyles.value?.getPropertyValue(cssProperty).trim() || '';
  }

  /**
   * 从 classList 中找到匹配某前缀的 Tailwind class
   * 例如找 'p-' 开头的类：p-4, py-2 等
   */
  function findClassByPrefix(prefix: string): string | null {
    const prefixWithDash = `${prefix}-`;
    return classList.value.find((c) => c === prefix || c.startsWith(prefixWithDash)) || null;
  }

  /**
   * 替换元素的某个 Tailwind 类并通知服务端写入源文件
   * @param tailwindPrefix - Tailwind 前缀 (如 'text', 'p', 'rounded')
   * @param newClass - 新类名 (如 'text-lg', 'p-4')，null 表示删除
   */
  async function updateTailwindClass(tailwindPrefix: string, newClass: string | null) {
    if (!selectionStore.selectedId || !selectedElement.value) return;

    const el = selectedElement.value;
    const oldClass = findClassByPrefix(tailwindPrefix);

    // 在 DOM 上直接应用（预览效果）
    if (oldClass) el.classList.remove(oldClass);
    if (newClass) el.classList.add(newClass);
    classList.value = Array.from(el.classList);

    // 构造 VueStructuralPath 发往服务端
    const vueComp = (el as any).__vueParentComponent;
    if (!vueComp?.type?.__file) return;

    const path: VueStructuralPath = {
      componentName: vueComp.type.name || vueComp.type.__name || 'Unknown',
      filePath: vueComp.type.__file,
      segments: buildPathSegments(el),
    };

    bridge.send({
      type: 'updateProperty',
      path,
      property: tailwindPrefix,
      value: newClass || '',
      vrId: selectionStore.selectedId || undefined,
    });
  }

  /**
   * 更新元素的完整 className（用于直接编辑）
   */
  async function updateClassList(newClasses: string[]) {
    if (!selectionStore.selectedId || !selectedElement.value) return;

    const el = selectedElement.value;
    const oldClasses = Array.from(el.classList);

    // 计算 diff
    const removed = oldClasses.filter((c) => !newClasses.includes(c));
    const added = newClasses.filter((c) => !oldClasses.includes(c));

    removed.forEach((c) => el.classList.remove(c));
    added.forEach((c) => el.classList.add(c));
    classList.value = Array.from(el.classList);

    const vueComp = (el as any).__vueParentComponent;
    if (!vueComp?.type?.__file) return;

    const path: VueStructuralPath = {
      componentName: vueComp.type.name || vueComp.type.__name || 'Unknown',
      filePath: vueComp.type.__file,
      segments: buildPathSegments(el),
    };

    // 批量发送变更
    const vrId = selectionStore.selectedId || undefined;
    for (const cls of removed) {
      bridge.send({ type: 'updateProperty', path, property: 'removeClass', value: cls, vrId });
    }
    for (const cls of added) {
      bridge.send({ type: 'updateProperty', path, property: 'addClass', value: cls, vrId });
    }
  }

  /** 发送 updateProperty 消息（通用） */
  function sendProperty(property: string, value: string) {
    if (!selectionStore.selectedId || !selectedElement.value) return;
    const el = selectedElement.value;
    const vueComp = (el as any).__vueParentComponent;
    if (!vueComp?.type?.__file) return;
    const path: VueStructuralPath = {
      componentName: vueComp.type.name || vueComp.type.__name || 'Unknown',
      filePath: vueComp.type.__file,
      segments: buildPathSegments(el),
    };
    bridge.send({
      type: 'updateProperty',
      path,
      property,
      value,
      vrId: selectionStore.selectedId || undefined,
    });
  }

  async function updateInlineStyle(cssProperty: string, value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style[cssProperty as any] = value;
    sendProperty(`style:${cssProperty}`, value);
  }

  async function updateDisplay(value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style.display = value;
    sendProperty('display', value);
  }

  async function updateFontWeight(value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style.fontWeight = value;
    sendProperty('font-weight', value);
  }

  async function updateTextAlign(value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style.textAlign = value;
    sendProperty('text-align', value);
  }

  async function updateBorderRadius(value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style.borderRadius = value;
    sendProperty('rounded', value);
  }

  async function updateBorderWidth(value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style.borderWidth = value;
    sendProperty('border', value);
  }

  async function updateBackgroundColor(value: string) {
    if (!selectedElement.value) return;
    selectedElement.value.style.backgroundColor = value;
    sendProperty('bg', value);
  }

  return {
    tailwindTokens,
    selectedElement,
    computedStyles,
    classList,
    setTailwindTokens,
    getCssValue,
    findClassByPrefix,
    updateTailwindClass,
    updateClassList,
    updateInlineStyle,
    updateDisplay,
    updateFontWeight,
    updateTextAlign,
    updateBorderRadius,
    updateBorderWidth,
    updateBackgroundColor,
    TAILWIND_PREFIX_CSS_MAP,
  };
});
