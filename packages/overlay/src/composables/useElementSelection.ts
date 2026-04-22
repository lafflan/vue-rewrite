import { onMounted, onUnmounted } from 'vue';
import { useSelectionStore } from '../stores/selection';
import { getVueInstance } from '../utils/vueInstance';
import type { ComponentInfo } from '@vue-rewrite/shared';

/** 从事件目标向上查找带 data-vr-id 的元素 */
function findVrElement(target: EventTarget | null): Element | null {
  if (!target || !(target instanceof Element)) return null;
  let el: Element | null = target;
  while (el) {
    if (el.hasAttribute('data-vr-id')) return el;
    el = el.parentElement;
  }
  return null;
}

/** 检查点击是否发生在 overlay 容器内部（不应触发选择） */
function isInsideOverlay(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Node)) return false;

  // 检查是否在 vue-rewrite-root 元素本身
  const root = document.getElementById('vue-rewrite-root');
  if (root === target || root?.contains(target as Node)) return true;

  // 检查是否在 shadow root 内部
  let el: Element | null = target as Element;
  while (el) {
    if (el.shadowRoot) return true;
    el = el.parentElement;
  }

  return false;
}

/** 从 DOM 元素构建 ComponentInfo */
function buildComponentInfo(el: HTMLElement): ComponentInfo | null {
  const instance = getVueInstance(el);
  if (!instance) return null;

  return {
    id: el.getAttribute('data-vr-id') || instance.componentName,
    name: instance.componentName,
    filePath: instance.filePath,
    lineNumber: instance.lineNumber,
    isSetupScript: false,
    hasScopedStyles: false,
    children: [],
    props: {
      hasClassBinding: false,
      hasStyleBinding: false,
      hasVIf: false,
      hasVFor: false,
      hasVShow: false,
    },
  };
}

/**
 * 提供元素选择和 hover 高亮能力
 * 在宿主 document 上监听事件，不干扰 overlay UI
 */
export function useElementSelection() {
  const selectionStore = useSelectionStore();

  function handleMouseMove(e: MouseEvent) {
    if (isInsideOverlay(e.target)) return;
    const el = findVrElement(e.target);
    selectionStore.hover(el?.getAttribute('data-vr-id') || null);
  }

  function handleClick(e: MouseEvent) {
    if (isInsideOverlay(e.target)) return;

    const el = findVrElement(e.target);
    if (!el) {
      selectionStore.clearSelection();
      return;
    }

    const id = el.getAttribute('data-vr-id');
    if (!id) return;

    const info = buildComponentInfo(el as HTMLElement);
    selectionStore.select(id, info || undefined);

    // 阻止原生点击（避免链接跳转等副作用）
    e.preventDefault();
    e.stopPropagation();
  }

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    // capture=true 确保在应用代码之前捕获
    document.addEventListener('click', handleClick, true);
  });

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
  });
}
