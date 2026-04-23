import { parse as parseSFC } from '@vue/compiler-sfc';
import { parse as parseTemplate, type ElementNode, type TemplateChildNode, type AttributeNode, type DirectiveNode } from '@vue/compiler-dom';

let idCounter = 0;

function generateVrId(): string {
  return `vr-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}

/**
 * 将 attrs 对象转换为字符串
 * 排除已作为标签名一部分的布尔属性（如 script 的 setup）
 */
function attrsToString(attrs: Record<string, string | true>, excludeKeys: string[] = []): string {
  if (!attrs || Object.keys(attrs).length === 0) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    // 跳过已排除的布尔属性（如 setup, scoped）
    if (excludeKeys.includes(key)) continue;
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

  // 如果已有 data-vr-id，说明已被处理过，跳过避免重复
  if (code.includes('data-vr-id=')) {
    return { code, sourceMap: '', errors: [] };
  }

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
    const attrsStr = attrsToString(descriptor.script.attrs, ['setup']);
    result += `<script${attrsStr}>\n${descriptor.script.content}\n</script>\n`;
  }

  // 处理 scriptSetup
  if (descriptor.scriptSetup) {
    const attrsStr = attrsToString(descriptor.scriptSetup.attrs, ['setup']);
    result += `<script setup${attrsStr}>\n${descriptor.scriptSetup.content}\n</script>\n`;
  }

  // 添加处理后的 template
  result += `<template>\n${processedTemplate}\n</template>\n`;

  // 处理 style 标签
  if (descriptor.styles.length > 0) {
    for (const style of descriptor.styles) {
      const attrsStr = attrsToString(style.attrs, ['scoped']);
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
    // parseTemplate 需要一个根元素，所以我们用 <template> 包裹
    const ast = parseTemplate(`<template>${template}</template>`);

    if (!ast.children || ast.children.length === 0) {
      return template;
    }

    // ast.children[0] 是我们包裹的 <template> 标签
    // 但它的 children 才是真正的内容
    // 由于 TypeScript 类型系统不知道这个结构，用类型断言
    const wrapperElement = ast.children[0] as ElementNode;
    const contentNodes = (wrapperElement as any).children || ast.children;
    const processedNodes = processNodes(contentNodes, errors);

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
 * 使用精确源码替换保持原始格式化
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

    // 获取 template 在源码中的起止位置
    const templateStart = descriptor.template.loc.start.offset;
    const templateContent = descriptor.template.content;

    // 解析 template AST 找到目标元素
    // parseTemplateContent 包装在 <template> 中，所以 offset 需要调整
    const ast = parseTemplateContent(templateContent);
    const wrapperElement = ast.children[0] as ElementNode;
    const templateNodes = (wrapperElement as any).children || ast.children;
    const el = findElementByVrId(templateNodes, vrId);

    if (!el) {
      return { code: source, success: false, error: `Element with data-vr-id="${vrId}" not found` };
    }

    // 调整偏移：parseTemplateContent 包装后 offset 是相对包装字符串的
    const WRAPPER_LEN = '<template>'.length;
    const elStartInContent = el.loc.start.offset - WRAPPER_LEN;
    const elEndInContent = el.loc.end.offset - WRAPPER_LEN;

    // 提取原始元素源码
    const originalElement = templateContent.substring(elStartInContent, elEndInContent);

    let modifiedElement: string;

    if (edit.kind === 'setText') {
      // 文本编辑：在原始元素的 children 中替换文本内容
      modifiedElement = replaceTextInElement(originalElement, el, edit.text);
    } else {
      // class 编辑：在原始元素的 class 属性上做替换
      modifiedElement = replaceClassInElement(originalElement, el, edit, elStartInContent, WRAPPER_LEN);
    }

    // 在原始源码中精确替换该元素
    const absStart = templateStart + elStartInContent;
    const absEnd = templateStart + elEndInContent;
    const modifiedSource = source.substring(0, absStart) + modifiedElement + source.substring(absEnd);
    return { code: modifiedSource, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 在元素的 children 中查找文本节点并替换
 */
function replaceTextInElement(
  originalElement: string,
  el: ElementNode & { dataVrId?: string },
  newText: string
): string {
  // 找到第一个文本子节点的位置
  const textNode = el.children?.find(c => c.type === 2);
  if (!textNode) {
    // 没有文本节点，在标签后插入
    const closingBracket = originalElement.indexOf('>');
    if (closingBracket === -1) return originalElement;
    return originalElement.substring(0, closingBracket + 1) + newText + originalElement.substring(closingBracket + 1).replace(/^[^<]*/, '');
  }

  // 文本节点在 children 中的位置
  const textOffset = (textNode as any).loc?.start?.offset || 0;
  const textEndOffset = (textNode as any).loc?.end?.offset || 0;

  // 计算在原始元素源码中的绝对偏移
  const elStartBracket = originalElement.indexOf('>');
  const contentStart = elStartBracket + 1;
  const textAbsStart = contentStart + textOffset;
  const textAbsEnd = contentStart + textEndOffset;

  return originalElement.substring(0, textAbsStart) + newText + originalElement.substring(textAbsEnd);
}

/**
 * 替换元素的 class 属性值
 */
function replaceClassInElement(
  originalElement: string,
  el: ElementNode & { dataVrId?: string },
  edit: ClassEdit,
  elStartInContent: number,
  WRAPPER_LEN: number
): string {
  // 找到 class attribute 在源码中的位置
  const classAttr = el.props?.find(
    (p) => p.type === 6 && (p as AttributeNode).name === 'class'
  ) as AttributeNode | undefined;

  if (!classAttr || !classAttr.value) {
    // 没有 class 属性，需要添加
    if (edit.kind === 'setClass') {
      // 在 data-vr-id 之后或开始标签结束前插入 class
      const vrAttr = el.props?.find(p => p.type === 6 && p.name === 'data-vr-id') as AttributeNode | undefined;
      if (vrAttr && vrAttr.value) {
        // 在 data-vr-id 之后插入
        const vrAttrEnd = vrAttr.loc.end.offset;
        return originalElement.substring(0, vrAttrEnd) + ` class="${edit.className}"` + originalElement.substring(vrAttrEnd);
      }
      // 在开始标签的 > 之前插入
      const gt = originalElement.indexOf('>');
      return originalElement.substring(0, gt) + ` class="${edit.className}"` + originalElement.substring(gt);
    }
    return originalElement;
  }

  // classAttr.loc.start 指向属性名开始（'class' 的 'c'），loc.end 指向 '>' 之后
  // 转换为相对于 originalElement 的偏移
  const attrAbsStart = classAttr.loc.start.offset - WRAPPER_LEN - elStartInContent;
  const attrAbsEnd = classAttr.loc.end.offset - WRAPPER_LEN - elStartInContent;

  let newClassValue: string;
  if (edit.kind === 'setClass') {
    newClassValue = edit.className;
  } else {
    // addClass / removeClass
    const existing = classAttr.value?.content || '';
    const classes = existing.split(/\s+/).filter(Boolean);
    if (edit.kind === 'addClass') {
      if (!classes.includes(edit.className)) classes.push(edit.className);
    } else if (edit.kind === 'removeClass') {
      const idx = classes.indexOf(edit.className);
      if (idx !== -1) classes.splice(idx, 1);
    }
    newClassValue = classes.join(' ');
  }

  // 构造新的 class 属性完整文本（保留引号）
  const newAttr = `class="${newClassValue}"`;

  return originalElement.substring(0, attrAbsStart) + newAttr + originalElement.substring(attrAbsEnd);
}

/**
 * 使用修改后的 template 内容重建 SFC
 */
function rebuildSfcWithEditedTemplate(
  originalSource: string,
  descriptor: ReturnType<typeof parseSFC>['descriptor'],
  editedTemplateContent: string,
  templateStart: number,
  templateEnd: number
): string {
  const beforeTemplate = originalSource.substring(0, templateStart);
  const afterTemplate = originalSource.substring(templateEnd);
  return `${beforeTemplate}<template>\n${editedTemplateContent}\n</template>${afterTemplate}`;
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
    const attrsStr = attrsToString(descriptor.script.attrs, ['setup']);
    result += `<script${attrsStr}>\n${descriptor.script.content}\n</script>\n`;
  }
  if (descriptor.scriptSetup) {
    const attrsStr = attrsToString(descriptor.scriptSetup.attrs, ['setup']);
    result += `<script setup${attrsStr}>\n${descriptor.scriptSetup.content}\n</script>\n`;
  }

  result += `<template>\n${editedTemplateContent}\n</template>\n`;

  for (const style of descriptor.styles) {
    const attrsStr = attrsToString(style.attrs, ['scoped']);
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

function getTemplateContentNodes(ast: ReturnType<typeof parseTemplate>) {
  // parseTemplate 返回的 ast.children 是根节点列表，需要跳过包装层 <template>
  const wrapperElement = ast.children[0] as ElementNode;
  return (wrapperElement as any).children || ast.children;
}

/**
 * 对 SFC 应用重排序（使用精确源码替换保持格式）
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

    const templateContent = descriptor.template.content;
    const templateStart = descriptor.template.loc.start.offset;
    const templateEnd = descriptor.template.loc.end.offset;

    // 解析 template AST（包装在 <template> 中）
    const ast = parseTemplateContent(templateContent);
    const wrapperElement = ast.children[0] as ElementNode;
    const contentNodes = (wrapperElement as any).children || ast.children;
    const el = findElementByVrId(contentNodes, vrId);
    if (!el) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const children = el.children || [];
    if (fromIndex < 0 || fromIndex >= children.length) {
      return { code: source, success: false, error: `Invalid fromIndex: ${fromIndex}` };
    }
    if (toIndex < 0 || toIndex >= children.length) {
      return { code: source, success: false, error: `Invalid toIndex: ${toIndex}` };
    }

    // 调整偏移：parseTemplateContent 包装后 offset 是相对包装字符串的
    // 包装字符串是 `<template>${templateContent}</template>`，<template> 是 11 个字符
    const WRAPPER_LEN = '<template>'.length;
    const elStartInContent = el.loc.start.offset - WRAPPER_LEN;
    const elEndInContent = el.loc.end.offset - WRAPPER_LEN;

    // 生成修改后的元素源码
    const [moved] = children.splice(fromIndex, 1);
    children.splice(toIndex, 0, moved);
    const modifiedElement = nodesToString([el] as any);

    // 在原始 template content 中精确替换
    const before = templateContent.substring(0, elStartInContent);
    const after = templateContent.substring(elEndInContent);
    const editedTemplateContent = before + modifiedElement + after;

    const modified = rebuildSfcWithEditedTemplate(source, descriptor, editedTemplateContent, templateStart, templateEnd);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 对 SFC 应用删除元素（使用精确源码替换保持格式）
 */
export function applySfcDelete(
  source: string,
  vrId: string
): { code: string; success: boolean; error?: string } {
  try {
    const { descriptor, errors: parseErrors } = parseSFC(source, { filename: 'delete.vue' });
    if (parseErrors.length > 0) return { code: source, success: false, error: parseErrors[0].message };
    if (!descriptor.template) return { code: source, success: false, error: 'No template' };

    const templateContent = descriptor.template.content;
    const templateStart = descriptor.template.loc.start.offset;
    const templateEnd = descriptor.template.loc.end.offset;

    // 解析 template AST（包装在 <template> 中）
    const ast = parseTemplateContent(templateContent);
    const wrapperElement = ast.children[0] as ElementNode;
    const contentNodes = (wrapperElement as any).children || ast.children;
    const found = findParentOf(contentNodes, vrId, null);
    if (!found) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const { parent, index } = found;
    const el = parent.children?.[index] as ElementNode;
    if (!el || el.type !== 1) return { code: source, success: false, error: 'Not an element' };

    // 调整偏移
    const WRAPPER_LEN = '<template>'.length;
    const elStartInContent = el.loc.start.offset - WRAPPER_LEN;
    const elEndInContent = el.loc.end.offset - WRAPPER_LEN;

    // 从原始 template content 中删除该元素
    const before = templateContent.substring(0, elStartInContent);
    const after = templateContent.substring(elEndInContent);
    const editedTemplateContent = before + after;

    const modified = rebuildSfcWithEditedTemplate(source, descriptor, editedTemplateContent, templateStart, templateEnd);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 对 SFC 应用复制元素（使用精确源码替换保持格式）
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

    const templateContent = descriptor.template.content;
    const templateStart = descriptor.template.loc.start.offset;
    const templateEnd = descriptor.template.loc.end.offset;

    // 解析 template AST（包装在 <template> 中）
    const ast = parseTemplateContent(templateContent);
    const wrapperElement = ast.children[0] as ElementNode;
    const contentNodes = (wrapperElement as any).children || ast.children;
    const found = findParentOf(contentNodes, vrId, null);
    if (!found) return { code: source, success: false, error: `Element not found: ${vrId}` };

    const { parent, index } = found;
    const original = parent.children?.[index] as ElementNode;
    if (!original || original.type !== 1) return { code: source, success: false, error: 'Can only duplicate element nodes' };

    // 深拷贝并更新 data-vr-id
    const clone = JSON.parse(JSON.stringify(original)) as ElementNode & { dataVrId?: string };
    for (const prop of clone.props || []) {
      if (prop.type === 6 && (prop as AttributeNode).name === 'data-vr-id') {
        (prop as AttributeNode).value = { type: 4, content: newVrId } as any;
      }
    }

    // 调整偏移
    const WRAPPER_LEN = '<template>'.length;
    const originalElEndInContent = original.loc.end.offset - WRAPPER_LEN;

    // 生成克隆元素的源码并插入到原元素之后
    const clonedElementStr = nodesToString([clone] as any);
    const before = templateContent.substring(0, originalElEndInContent);
    const after = templateContent.substring(originalElEndInContent);
    const editedTemplateContent = before + clonedElementStr + after;

    const modified = rebuildSfcWithEditedTemplate(source, descriptor, editedTemplateContent, templateStart, templateEnd);
    return { code: modified, success: true };
  } catch (err) {
    return { code: source, success: false, error: String(err) };
  }
}

/**
 * 对 SFC 设置 :class 绑定（使用精确源码替换保持格式）
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

    const templateContent = descriptor.template.content;
    const templateStart = descriptor.template.loc.start.offset;
    const templateEnd = descriptor.template.loc.end.offset;

    // 解析 template AST（包装在 <template> 中）
    const ast = parseTemplateContent(templateContent);
    const wrapperElement = ast.children[0] as ElementNode;
    const contentNodes = (wrapperElement as any).children || ast.children;
    const el = findElementByVrId(contentNodes, vrId);
    if (!el) return { code: source, success: false, error: `Element not found: ${vrId}` };

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
      el.props?.push({ type: 6, name: 'class', value: { type: 4, content: value }, loc: {} } as any);
    } else {
      const arg = { type: 4, content: 'class' } as any;
      const exp = { type: 4, content: value } as any;
      el.props?.push({ type: 7, name: 'bind', arg, exp, loc: {} } as any);
    }

    // 调整偏移
    const WRAPPER_LEN = '<template>'.length;
    const elStartInContent = el.loc.start.offset - WRAPPER_LEN;
    const elEndInContent = el.loc.end.offset - WRAPPER_LEN;

    // 生成修改后的元素源码
    const modifiedElement = nodesToString([el] as any);

    // 在原始 template content 中精确替换
    const before = templateContent.substring(0, elStartInContent);
    const after = templateContent.substring(elEndInContent);
    const editedTemplateContent = before + modifiedElement + after;

    const modified = rebuildSfcWithEditedTemplate(source, descriptor, editedTemplateContent, templateStart, templateEnd);
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
