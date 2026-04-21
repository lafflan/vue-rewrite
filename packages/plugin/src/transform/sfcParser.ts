import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseTemplate, type ElementNode, type TemplateChildNode, type AttributeNode, type DirectiveNode } from '@vue/compiler-dom';

let idCounter = 0;

function generateVrId(): string {
  return `vr-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}

/**
 * 将 attrs 对象转换为字符串
 */
function attrsToString(attrs: Record<string, string | true>): string {
  if (!attrs || Object.keys(attrs).length === 0) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === true) {
      parts.push(key);
    } else {
      parts.push(`${key}="${value}"`);
    }
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

interface TransformResult {
  code: string;
  sourceMap: string;
  errors: string[];
}

/**
 * 为 Vue SFC 的 template 部分注入 data-vr-id 属性
 * 用于建立 DOM 元素到组件实例的绑定
 */
export function transformSFC(code: string, id: string): TransformResult {
  const errors: string[] = [];

  // 解析 SFC
  const { descriptor, errors: parseErrors } = parseSFC(code, {
    filename: id,
  });

  if (parseErrors.length > 0) {
    parseErrors.forEach((err) => errors.push(err.message));
    return { code, sourceMap: '', errors };
  }

  // 如果没有 template，直接返回
  if (!descriptor.template || !descriptor.template.content) {
    return { code, sourceMap: '', errors };
  }

  const templateContent = descriptor.template.content;

  // 生成带 data-vr-id 的 template
  const processedTemplate = processTemplate(templateContent, errors);

  // 重建 SFC
  let result = '';

  // 处理 script 标签
  if (descriptor.script) {
    const attrsStr = attrsToString(descriptor.script.attrs);
    result += `<script${attrsStr}>\n${descriptor.script.content}\n</script>\n`;
  }

  // 处理 scriptSetup
  if (descriptor.scriptSetup) {
    const attrsStr = attrsToString(descriptor.scriptSetup.attrs);
    result += `<script setup${attrsStr}>\n${descriptor.scriptSetup.content}\n</script>\n`;
  }

  // 添加处理后的 template
  result += `<template>\n${processedTemplate}\n</template>\n`;

  // 处理 style 标签
  if (descriptor.styles.length > 0) {
    for (const style of descriptor.styles) {
      const attrsStr = attrsToString(style.attrs);
      result += `<style${attrsStr}>\n${style.content}\n</style>\n`;
    }
  }

  return { code: result, sourceMap: '', errors };
}

/**
 * 处理 template AST，为每个元素添加 data-vr-id
 */
function processTemplate(template: string, errors: string[]): string {
  try {
    // 使用 compiler-dom 的 parse 解析 template
    const ast = parseTemplate(`<template>${template}</template>`);

    if (!ast.children || ast.children.length === 0) {
      return template;
    }

    const processedNodes = processNodes(ast.children, errors);

    // 将处理后的节点转回字符串
    return nodesToString(processedNodes);
  } catch (err) {
    errors.push(`Template parse error: ${String(err)}`);
    return template;
  }
}

/**
 * 递归处理 AST 节点
 */
function processNodes(
  nodes: TemplateChildNode[],
  errors: string[]
): Array<TemplateChildNode & { dataVrId?: string }> {
  const result: Array<TemplateChildNode & { dataVrId?: string }> = [];

  for (const node of nodes) {
    if (node.type === 1) {
      // Element 节点
      const element = node as ElementNode;
      const processedElement = { ...element } as ElementNode & { dataVrId?: string };

      // 为元素生成唯一的 vr-id
      processedElement.dataVrId = generateVrId();

      // 递归处理子节点
      if (element.children && element.children.length > 0) {
        processedElement.children = processNodes(element.children, errors) as any;
      }

      result.push(processedElement as any);
    } else {
      result.push(node as any);
    }
  }

  return result;
}

/**
 * 将处理后的节点转回字符串
 */
function nodesToString(nodes: Array<TemplateChildNode & { dataVrId?: string }>): string {
  let result = '';

  for (const node of nodes) {
    if (node.type === 1) {
      // Element
      const el = node as ElementNode & { dataVrId?: string };
      const tag = el.tag;
      const vrId = el.dataVrId ? ` data-vr-id="${el.dataVrId}"` : '';

      // 处理已有属性
      let attrStr = '';
      if (el.props) {
        for (const prop of el.props) {
          if (prop.type === 6) {
            // Attribute
            const attr = prop as AttributeNode;
            if (attr.name !== 'data-vr-id') {
              attrStr += ` ${attr.name}`;
              if (attr.value) {
                attrStr += `="${attr.value.content}"`;
              }
            }
          } else if (prop.type === 7) {
            // Directive
            const dir = prop as DirectiveNode;
            if (dir.name === 'bind' && dir.arg && (dir.arg as any).content === 'data-vr-id') {
              continue;
            }
            const argStr = dir.arg ? (dir.arg as any).content || '' : '';
            const expStr = dir.exp ? (dir.exp as any).content || '' : '';
            attrStr += ` :${argStr}="${expStr}"`;
          }
        }
      }

      // 添加 data-vr-id
      attrStr += vrId;

      // 处理子节点
      let childrenStr = '';
      if (el.children && el.children.length > 0) {
        childrenStr = nodesToString(el.children as any);
      }

      // 自闭合标签
      const voidTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'];
      if (voidTags.includes(tag)) {
        result += `<${tag}${attrStr ? ' ' + attrStr.trim() : ''}/>`;
      } else {
        result += `<${tag}${attrStr ? ' ' + attrStr.trim() : ''}>${childrenStr}</${tag}>`;
      }
    } else if (node.type === 2) {
      // Text
      result += (node as any).content || '';
    } else if (node.type === 3) {
      // Comment
      result += `<!--${(node as any).content}-->`;
    } else if (node.type === 5) {
      // Interpolation
      result += (node as any).content || '';
    } else if (node.type === 8) {
      // Compound (template + text mix)
      result += (node as any).content || '';
    }
  }

  return result;
}

/**
 * 解析 Vue SFC 获取组件信息
 */
export function parseSFCInfo(code: string, id: string): {
  componentInfo: {
    name: string;
    filePath: string;
    isSetupScript: boolean;
    hasScopedStyles: boolean;
  } | null;
  templateAst: any;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const { descriptor, errors: parseErrors } = parseSFC(code, { filename: id });

    if (parseErrors.length > 0) {
      parseErrors.forEach((err) => errors.push(err.message));
    }

    // 从文件名推断组件名
    const fileName = id.split('/').pop()?.replace('.vue', '') || 'Component';
    const name = fileName.charAt(0).toUpperCase() + fileName.slice(1);

    // 检查是否有 setup script
    const isSetupScript = !!descriptor.scriptSetup;

    // 检查是否有 scoped styles
    const hasScopedStyles = descriptor.styles.some((s) => s.attrs?.scoped);

    return {
      componentInfo: {
        name,
        filePath: id,
        isSetupScript,
        hasScopedStyles,
      },
      templateAst: descriptor.template?.ast || null,
      errors,
    };
  } catch (err) {
    errors.push(`SFC parse error: ${String(err)}`);
    return {
      componentInfo: null,
      templateAst: null,
      errors,
    };
  }
}

/**
 * 遍历 AST 找到带特定 data-vr-id 的元素节点
 */
function findElementByVrId(
  nodes: TemplateChildNode[],
  vrId: string
): (ElementNode & { dataVrId?: string }) | null {
  for (const node of nodes) {
    if (node.type === 1) {
      const el = node as ElementNode & { dataVrId?: string };
      // 元素的 data-vr-id 存在 props 中 (type=6 是 attribute, type=7 是 directive)
      for (const prop of el.props || []) {
        if (prop.type === 6) {
          const attr = prop as AttributeNode;
          if (attr.name === 'data-vr-id' && attr.value?.content === vrId) {
            return el;
          }
        } else if (prop.type === 7) {
          const dir = prop as DirectiveNode;
          if (dir.name === 'bind' && (dir.arg as any)?.content === 'data-vr-id' && (dir.exp as any)?.content === vrId) {
            return el;
          }
        }
      }
      // 递归搜索子节点
      if (el.children?.length) {
        const found = findElementByVrId(el.children, vrId);
        if (found) return found;
      }
    }
  }
  return null;
}

type ClassEdit =
  | { kind: 'addClass'; className: string }
  | { kind: 'removeClass'; className: string }
  | { kind: 'setClass'; className: string }
  | { kind: 'setText'; text: string };

/**
 * 对 SFC 的 template 部分应用编辑，返回新的完整 SFC 代码
 */
export function applySfcEdit(
  source: string,
  vrId: string,
  edit: ClassEdit
): { code: string; success: boolean; error?: string } {
  try {
    const { descriptor, errors: parseErrors } = parseSFC(source, { filename: 'edit.vue' });
    if (parseErrors.length > 0) {
      return { code: source, success: false, error: parseErrors[0].message };
    }
    if (!descriptor.template) {
      return { code: source, success: false, error: 'No template in SFC' };
    }

    // 解析 template AST（需要先包装一层）
    const ast = parseTemplate(`<template>${descriptor.template.content}</template>`);
    const el = findElementByVrId(ast.children, vrId);

    if (!el) {
      return { code: source, success: false, error: `Element with data-vr-id="${vrId}" not found` };
    }

    // 应用编辑
    if (edit.kind === 'setText') {
      // 替换元素的文本内容（第一个 text 子节点）
      el.children = el.children.filter((c) => c.type !== 2 && c.type !== 5 && c.type !== 8);
      el.children.push({ type: 2, content: edit.text } as any);
    } else {
      // class 编辑
      applyClassEditToElement(el, edit);
    }

    // 重建 template
    const editedTemplateContent = nodesToString(el.children || []);
    const modifiedSfc = rebuildSfc(descriptor, editedTemplateContent);
    return { code: modifiedSfc, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

function applyClassEditToElement(
  el: ElementNode & { dataVrId?: string },
  edit: ClassEdit
): void {
  const classProp = el.props?.find(
    (p) =>
      (p.type === 6 && (p as AttributeNode).name === 'class') ||
      (p.type === 7 && (p as DirectiveNode).name === 'bind' && (p as DirectiveNode).arg && ((p as DirectiveNode).arg as any)?.content === 'class')
  );

  if (edit.kind === 'setClass') {
    if (classProp && classProp.type === 6) {
      (classProp as AttributeNode).value = { type: 4, content: edit.className } as any;
    } else if (classProp && classProp.type === 7) {
      (classProp as DirectiveNode).exp = { type: 4, content: edit.className } as any;
    } else {
      // 添加新的 class attribute
      el.props = el.props || [];
      el.props.push({ type: 6, name: 'class', value: { type: 4, content: edit.className }, loc: {} } as any);
    }
    return;
  }

  // addClass / removeClass 需要解析现有 class
  if (!classProp || classProp.type !== 6) return;

  const attr = classProp as AttributeNode;
  const existing = attr.value?.content || '';
  const classes = existing.split(/\s+/).filter(Boolean);

  if (edit.kind === 'addClass') {
    if (!classes.includes(edit.className)) classes.push(edit.className);
  } else if (edit.kind === 'removeClass') {
    const idx = classes.indexOf(edit.className);
    if (idx !== -1) classes.splice(idx, 1);
  }

  attr.value = { type: 4, content: classes.join(' ') } as any;
}

function rebuildSfc(
  descriptor: ReturnType<typeof parseSFC>['descriptor'],
  editedTemplateContent: string
): string {
  let result = '';

  if (descriptor.script) {
    const attrsStr = attrsToString(descriptor.script.attrs);
    result += `<script${attrsStr}>\n${descriptor.script.content}\n</script>\n`;
  }
  if (descriptor.scriptSetup) {
    const attrsStr = attrsToString(descriptor.scriptSetup.attrs);
    result += `<script setup${attrsStr}>\n${descriptor.scriptSetup.content}\n</script>\n`;
  }

  result += `<template>\n${editedTemplateContent}\n</template>\n`;

  for (const style of descriptor.styles) {
    const attrsStr = attrsToString(style.attrs);
    result += `<style${attrsStr}>\n${style.content}\n</style>\n`;
  }

  return result;
}

function findParentOf(
  children: TemplateChildNode[],
  vrId: string,
  parent: any
): { parent: any; index: number } | null {
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type === 1) {
      const el = node as ElementNode & { dataVrId?: string };
      for (const prop of el.props || []) {
        if (prop.type === 6) {
          const attr = prop as AttributeNode;
          if (attr.name === 'data-vr-id' && attr.value?.content === vrId) {
            return { parent, index: i };
          }
        }
      }
      if (el.children?.length) {
        const found = findParentOf(el.children, vrId, el);
        if (found) return found;
      }
    }
  }
  return null;
}

/** 将 template 字符串解析为 AST（需要包装在 template 标签内） */
function parseTemplateContent(content: string) {
  return parseTemplate(`<template>${content}</template>`);
}

/**
 * 对 SFC 应用重排序
 */
export function applySfcReorder(
  source: string,
  vrId: string,
  fromIndex: number,
  toIndex: number
): { code: string; success: boolean; error?: string } {
  try {
    const { descriptor, errors: parseErrors } = parseSFC(source, { filename: 'reorder.vue' });
    if (parseErrors.length > 0) return { code: source, success: false, error: parseErrors[0].message };
    if (!descriptor.template) return { code: source, success: false, error: 'No template' };

    const ast = parseTemplateContent(descriptor.template.content);
    const found = findParentOf(ast.children, vrId, ast);
    if (!found) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const { parent, index } = found;
    const children = parent.children || [];
    if (fromIndex < 0 || fromIndex >= children.length) {
      return { code: source, success: false, error: `Invalid fromIndex: ${fromIndex}` };
    }
    if (toIndex < 0 || toIndex >= children.length) {
      return { code: source, success: false, error: `Invalid toIndex: ${toIndex}` };
    }

    const [moved] = children.splice(fromIndex, 1);
    children.splice(toIndex, 0, moved);

    const editedContent = nodesToString(ast.children || []);
    const modified = rebuildSfc(descriptor, editedContent);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 对 SFC 应用删除元素
 */
export function applySfcDelete(
  source: string,
  vrId: string
): { code: string; success: boolean; error?: string } {
  try {
    const { descriptor, errors: parseErrors } = parseSFC(source, { filename: 'delete.vue' });
    if (parseErrors.length > 0) return { code: source, success: false, error: parseErrors[0].message };
    if (!descriptor.template) return { code: source, success: false, error: 'No template' };

    const ast = parseTemplateContent(descriptor.template.content);
    const found = findParentOf(ast.children, vrId, ast);
    if (!found) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const { parent, index } = found;
    parent.children?.splice(index, 1);

    const editedContent = nodesToString(ast.children || []);
    const modified = rebuildSfc(descriptor, editedContent);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 对 SFC 应用复制元素
 */
export function applySfcDuplicate(
  source: string,
  vrId: string,
  newVrId: string
): { code: string; success: boolean; error?: string } {
  try {
    const { descriptor, errors: parseErrors } = parseSFC(source, { filename: 'duplicate.vue' });
    if (parseErrors.length > 0) return { code: source, success: false, error: parseErrors[0].message };
    if (!descriptor.template) return { code: source, success: false, error: 'No template' };

    const ast = parseTemplateContent(descriptor.template.content);
    const found = findParentOf(ast.children, vrId, ast);
    if (!found) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const { parent, index } = found;
    const original = parent.children?.[index];
    if (!original || original.type !== 1) return { code: source, success: false, error: 'Can only duplicate element nodes' };

    // 深拷贝并更新 data-vr-id
    const clone = JSON.parse(JSON.stringify(original)) as ElementNode & { dataVrId?: string };
    // 更新克隆的 data-vr-id
    for (const prop of clone.props || []) {
      if (prop.type === 6 && (prop as AttributeNode).name === 'data-vr-id') {
        (prop as AttributeNode).value = { type: 4, content: newVrId } as any;
      }
    }

    parent.children?.splice(index + 1, 0, clone);

    const editedContent = nodesToString(ast.children || []);
    const modified = rebuildSfc(descriptor, editedContent);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 对 SFC 设置 :class 绑定
 */
export function applySfcClassBinding(
  source: string,
  vrId: string,
  bindingType: 'static' | 'dynamic' | 'object' | 'array',
  value: string
): { code: string; success: boolean; error?: string } {
  try {
    const { descriptor, errors: parseErrors } = parseSFC(source, { filename: 'binding.vue' });
    if (parseErrors.length > 0) return { code: source, success: false, error: parseErrors[0].message };
    if (!descriptor.template) return { code: source, success: false, error: 'No template' };

    const ast = parseTemplateContent(descriptor.template.content);
    const found = findParentOf(ast.children, vrId, ast);
    if (!found) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const el = found.parent.children?.[found.index] as ElementNode & { dataVrId?: string };
    if (!el || el.type !== 1) return { code: source, success: false, error: 'Not an element' };

    // 移除现有关于 class 的 attribute/directive
    el.props = (el.props || []).filter((p) => {
      if (p.type === 6) return (p as AttributeNode).name !== 'class';
      if (p.type === 7) {
        const dir = p as DirectiveNode;
        return !(dir.name === 'bind' && (dir.arg as any)?.content === 'class');
      }
      return true;
    });

    if (bindingType === 'static') {
      // class="value"
      el.props?.push({ type: 6, name: 'class', value: { type: 4, content: value }, loc: {} } as any);
    } else {
      // :class="value"
      const arg = { type: 4, content: 'class' } as any;
      const exp = { type: 4, content: value } as any;
      el.props?.push({ type: 7, name: 'bind', arg, exp, loc: {} } as any);
    }

    const editedContent = nodesToString(ast.children || []);
    const modified = rebuildSfc(descriptor, editedContent);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 根据 VueStructuralPath 查找对应的 AST 节点
 */
export function findNodeByPath(
  root: any,
  segments: Array<{ name: string; discriminator: any }>
): any | null {
  if (!segments || segments.length === 0) return root;

  let current = root;
  let pathIndex = 0;

  while (current && pathIndex < segments.length) {
    const segment = segments[pathIndex];

    if (!current.children) return null;

    let found = false;
    for (const child of current.children) {
      if (child.type === 1) {
        const el = child as ElementNode;
        // 根据 discriminator 匹配
        if (segment.discriminator.type === 'root' && pathIndex === 0) {
          current = el;
          found = true;
          break;
        }
        if (segment.discriminator.type === 'v-for') {
          // 匹配 v-for 循环中的元素
          if (el.props?.some((p: any) => p.name === 'v-for')) {
            current = el;
            found = true;
            break;
          }
        }
        // 其他匹配逻辑...
      }
    }

    if (!found) return null;
    pathIndex++;
  }

  return current;
}
