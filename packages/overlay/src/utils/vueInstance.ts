/**
 * Vue 组件实例解析工具
 * 通过 DOM 元素上的 __vueParentComponent 链获取组件信息
 */

export interface VueInstance {
  componentName: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  displayName: string;
  parent?: VueInstance;
}

/**
 * 从 DOM 元素获取 Vue 组件实例
 */
export function getVueInstance(el: HTMLElement): VueInstance | null {
  // Vue 3 使用 __vueParentComponent 属性
  // @ts-ignore - Vue 内部属性
  let current: HTMLElement | null = el;

  while (current) {
    // @ts-ignore - Vue 3 内部属性
    const vueComp = current.__vueParentComponent;
    if (vueComp) {
      return parseVueComponent(vueComp, current);
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * 解析 Vue 组件实例对象
 */
function parseVueComponent(vueComp: any, el: HTMLElement): VueInstance | null {
  if (!vueComp) return null;

  let componentName = 'Unknown';
  let filePath = '';
  let lineNumber = 0;
  let columnNumber = 0;

  // Vue 3 composition API 组件
  if (vueComp.type) {
    const type = vueComp.type;

    // 获取组件名称
    if (type.name) {
      componentName = type.name;
    } else if (type.__name) {
      componentName = type.__name;
    } else if (type.displayName) {
      componentName = type.displayName;
    }

    // 尝试从组件的 __file 属性获取文件路径
    if (type.__file) {
      filePath = type.__file;
    }

    // 尝试从 ctx 获取 source
    if (vueComp.ctx && vueComp.ctx.source) {
      const source = vueComp.ctx.source;
      filePath = source?.fileName || filePath;
      lineNumber = source?.lineNumber || 0;
      columnNumber = source?.columnNumber || 0;
    }
  }

  // 递归获取父组件
  let parent: VueInstance | undefined;
  if (vueComp.parent && vueComp.parent.type) {
    parent = parseVueComponent(vueComp.parent, el);
  }

  return {
    componentName,
    filePath,
    lineNumber,
    columnNumber,
    displayName: componentName,
    parent,
  };
}

/**
 * 获取元素的唯一标识符
 * 优先使用 data-vr-id，如果没有则生成一个
 */
export function getElementVrId(el: HTMLElement): string | null {
  return el.getAttribute('data-vr-id');
}

/**
 * 获取最近的可编辑父元素
 */
export function getEditableParent(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el;

  while (current) {
    // 检查是否是 VR 可编辑的元素
    if (current.hasAttribute('data-vr-id')) {
      return current;
    }

    // 检查是否是可编辑的元素
    const tagName = current.tagName.toLowerCase();
    if (['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'a'].includes(tagName)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * 查找元素的 Vue 组件链
 */
export function getComponentChain(el: HTMLElement): VueInstance[] {
  const chain: VueInstance[] = [];
  let current: HTMLElement | null = el;

  while (current) {
    // @ts-ignore
    const vueComp = current.__vueParentComponent;
    if (vueComp) {
      const instance = parseVueComponent(vueComp, current);
      if (instance) {
        chain.unshift(instance);
      }
    }
    current = current.parentElement;
  }

  return chain;
}

/**
 * 检查元素是否属于某个组件
 */
export function isInsideComponent(el: HTMLElement, componentName: string): boolean {
  const chain = getComponentChain(el);
  return chain.some((c) => c.componentName === componentName);
}

/**
 * 获取组件的根元素
 */
export function getComponentRoot(el: HTMLElement): HTMLElement | null {
  const chain = getComponentChain(el);
  if (chain.length === 0) return null;

  // 从最外层组件开始查找
  const rootComponent = chain[0];

  // 向上查找包含该组件根元素的 DOM
  let current: HTMLElement | null = el;
  while (current) {
    // @ts-ignore
    const vueComp = current.__vueParentComponent;
    if (vueComp && vueComp.type && vueComp.type.__file === rootComponent.filePath) {
      return current;
    }
    current = current.parentElement;
  }

  return el;
}
