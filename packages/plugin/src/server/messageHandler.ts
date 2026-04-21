import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import type { ClientMessage, ServerMessage, VueStructuralPath } from '@vue-rewrite/shared';
import { logger } from '../utils/logger.js';
import { isProjectFilePathSafe } from '../utils/pathResolver.js';
import { discoverFile } from '../utils/fileDiscovery.js';
import { getFileStats } from '../utils/fileStats.js';
import { transformSFC, findNodeByPath, applySfcEdit, applySfcReorder, applySfcDelete, applySfcDuplicate, applySfcClassBinding } from '../transform/sfcParser.js';

interface MessageContext {
  projectRoot: string;
  broadcast: (msg: ServerMessage) => void;
}

const operationHistory: Map<string, { operations: unknown[]; timestamp: number; backup: Map<string, string> }> = new Map();

export async function processMessage(
  msg: ClientMessage,
  context: MessageContext
): Promise<ServerMessage | null> {
  const { projectRoot } = context;

  try {
    switch (msg.type) {
      case 'ping':
        return { type: 'pong' };

      case 'getSiblings':
        return { type: 'siblingsList', path: msg.path, siblings: [] };

      case 'undo':
        return handleUndo(msg.operationId, context);

      case 'updateProperty':
        return handleUpdateProperty(msg.path, msg.property, msg.value, context, msg.vrId);

      case 'updateProperties':
        return handleUpdateProperties(msg.operations, context);

      case 'updateText':
        return handleUpdateText(msg.path, msg.text, context, msg.vrId);

      case 'revertChanges':
        return handleRevertChanges(msg.operationId, context);

      case 'discoverFile':
        const result = await discoverFile(msg.componentName, projectRoot);
        return { type: 'discoverFileResult', result };

      case 'commitBatch':
        return handleCommitBatch(msg.operations, context);

      case 'fileStat':
        const stat = getFileStats(msg.filePath, projectRoot);
        return { type: 'fileStatResult', result: stat };

      case 'getComponentInfo':
        return handleGetComponentInfo(msg.path, context);

      case 'reorderElement':
        return handleReorderElement(msg.path, msg.fromIndex, msg.toIndex, context, msg.vrId);

      case 'duplicateElement':
        return handleDuplicateElement(msg.path, context, msg.vrId);

      case 'deleteElement':
        return handleDeleteElement(msg.path, context, msg.vrId);

      case 'setClassBinding':
        return handleSetClassBinding(msg.path, msg.bindingType, msg.value, context, msg.vrId);

      default:
        return { type: 'error', message: `Unknown message type` };
    }
  } catch (err) {
    logger.error('Error processing message:', err);
    return { type: 'error', message: String(err) };
  }
}

function handleUndo(operationId: string, context: MessageContext): ServerMessage {
  const history = operationHistory.get(operationId);
  if (!history) {
    return { type: 'undoFailed', operationId, error: 'Operation not found' };
  }

  // Restore backed up files
  for (const [filePath, content] of history.backup) {
    try {
      writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      logger.error(`Failed to restore file ${filePath}:`, err);
    }
  }

  operationHistory.delete(operationId);
  return { type: 'undoComplete', operationId, success: true };
}

function handleUpdateProperty(
  path: VueStructuralPath,
  property: string,
  value: string,
  context: MessageContext,
  vrId?: string
): ServerMessage {
  if (!isProjectFilePathSafe(path.filePath, context.projectRoot)) {
    return {
      type: 'updatePropertyComplete',
      path,
      property,
      success: false,
      error: { code: 'FILE_CHANGED', message: 'Invalid file path', file: path.filePath },
    };
  }

  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'updatePropertyComplete',
        path,
        property,
        success: false,
        error: { code: 'FILE_CHANGED', message: 'File not found', file: path.filePath },
      };
    }

    if (!vrId) {
      return {
        type: 'updatePropertyComplete',
        path,
        property,
        success: false,
        error: { code: 'INVALID_PATH', message: 'Missing vrId', file: path.filePath },
      };
    }

    const originalContent = readFileSync(filePath, 'utf-8');

    // 根据 property 类型构造编辑操作
    let edit;
    if (property === 'removeClass') {
      edit = { kind: 'removeClass' as const, className: value };
    } else if (property === 'addClass') {
      edit = { kind: 'addClass' as const, className: value };
    } else {
      // 其他情况：直接设置 class
      edit = { kind: 'setClass' as const, className: value };
    }

    const { code: modified, success, error } = applySfcEdit(originalContent, vrId, edit);
    if (!success) {
      return {
        type: 'updatePropertyComplete',
        path,
        property,
        success: false,
        error: { code: 'FILE_CHANGED', message: error || 'Edit failed', file: path.filePath },
      };
    }

    // 保存操作历史（备份原始内容）
    const operationId = `op-${Date.now()}`;
    const backup = new Map([[filePath, originalContent]]);
    operationHistory.set(operationId, { operations: [{ type: 'updateProperty', path, property, value }], timestamp: Date.now(), backup });

    // 写入文件
    writeFileSync(filePath, modified, 'utf-8');
    logger.debug(`Property ${property}=${value} applied to vrId=${vrId} for ${path.filePath}`);
    return { type: 'updatePropertyComplete', path, property, success: true };
  } catch (err) {
    logger.error('Failed to update property:', err);
    return {
      type: 'updatePropertyComplete',
      path,
      property,
      success: false,
      error: { code: 'FILE_CHANGED', message: String(err), file: path.filePath },
    };
  }
}

function handleUpdateProperties(
  operations: Array<{ path: VueStructuralPath; property: string; value: string }>,
  context: MessageContext
): ServerMessage {
  const operationId = `op-${Date.now()}`;
  const backup = new Map<string, string>();

  try {
    for (const op of operations) {
      const filePath = resolve(context.projectRoot, op.path.filePath);
      if (!backup.has(filePath) && existsSync(filePath)) {
        backup.set(filePath, readFileSync(filePath, 'utf-8'));
      }
    }

    operationHistory.set(operationId, {
      operations,
      timestamp: Date.now(),
      backup,
    });

    return { type: 'commitBatchComplete', operationId, success: true };
  } catch (err) {
    logger.error('Failed to update properties:', err);
    return { type: 'commitBatchComplete', operationId, success: false, error: { code: 'FILE_CHANGED', message: String(err) } };
  }
}

function handleUpdateText(
  path: VueStructuralPath,
  text: string,
  context: MessageContext,
  vrId?: string
): ServerMessage {
  if (!isProjectFilePathSafe(path.filePath, context.projectRoot)) {
    return {
      type: 'updateTextComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: 'Invalid file path', file: path.filePath },
    };
  }

  if (!vrId) {
    return {
      type: 'updateTextComplete',
      path,
      success: false,
      error: { code: 'INVALID_PATH', message: 'Missing vrId', file: path.filePath },
    };
  }

  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'updateTextComplete',
        path,
        success: false,
        error: { code: 'FILE_CHANGED', message: 'File not found', file: path.filePath },
      };
    }

    const originalContent = readFileSync(filePath, 'utf-8');

    const { code: modified, success, error } = applySfcEdit(originalContent, vrId, { kind: 'setText', text });
    if (!success) {
      return {
        type: 'updateTextComplete',
        path,
        success: false,
        error: { code: 'FILE_CHANGED', message: error || 'Edit failed', file: path.filePath },
      };
    }

    // 保存操作历史
    const operationId = `op-${Date.now()}`;
    const backup = new Map([[filePath, originalContent]]);
    operationHistory.set(operationId, {
      operations: [{ type: 'updateText', path, text }],
      timestamp: Date.now(),
      backup,
    });

    writeFileSync(filePath, modified, 'utf-8');
    logger.debug(`Text updated to "${text.substring(0, 50)}..." for ${path.filePath}`);
    return { type: 'updateTextComplete', path, success: true };
  } catch (err) {
    logger.error('Failed to update text:', err);
    return {
      type: 'updateTextComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: String(err), file: path.filePath },
    };
  }
}

function handleRevertChanges(operationId: string, context: MessageContext): ServerMessage {
  const history = operationHistory.get(operationId);
  if (!history) {
    return { type: 'revertFailed', operationId, error: 'Operation not found' };
  }

  // Restore backed up files
  for (const [filePath, content] of history.backup) {
    try {
      writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      logger.error(`Failed to restore file ${filePath}:`, err);
    }
  }

  operationHistory.delete(operationId);
  return { type: 'revertComplete', operationId, success: true };
}

function handleCommitBatch(
  operations: unknown[],
  context: MessageContext
): ServerMessage {
  const operationId = `op-${Date.now()}`;
  const backup = new Map<string, string>();

  // 备份所有被修改的文件
  const filePaths = new Set<string>();
  for (const op of operations) {
    const opObj = op as { file?: string };
    if (opObj.file) {
      filePaths.add(opObj.file);
    }
  }

  for (const filePath of filePaths) {
    const resolvedPath = isAbsolute(filePath)
      ? filePath
      : resolve(context.projectRoot, filePath);
    if (existsSync(resolvedPath)) {
      backup.set(resolvedPath, readFileSync(resolvedPath, 'utf-8'));
    }
  }

  operationHistory.set(operationId, {
    operations,
    timestamp: Date.now(),
    backup,
  });

  return { type: 'commitBatchComplete', operationId, success: true };
}

function handleGetComponentInfo(
  path: VueStructuralPath,
  context: MessageContext
): ServerMessage {
  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'componentInfo',
        path,
        info: null,
      };
    }

    const content = readFileSync(filePath, 'utf-8');
    const { parse: parseSFC } = require('@vue/compiler-sfc');
    const { descriptor } = parseSFC(content, { filename: filePath });

    const info = {
      id: path.componentName,
      name: path.componentName,
      filePath: path.filePath,
      lineNumber: 0,
      isSetupScript: !!descriptor.scriptSetup,
      hasScopedStyles: descriptor.styles.some((s: { props?: string }) => s.props?.includes('scoped')),
      templateContent: descriptor.template?.content,
      children: [] as any[],
      props: {
        hasClassBinding: descriptor.template?.props?.some((p: { name: string }) => p.name === 'class' || p.name === ':class'),
        hasStyleBinding: descriptor.template?.props?.some((p: { name: string }) => p.name === 'style' || p.name === ':style'),
        hasVIf: descriptor.template?.props?.some((p: { name: string }) => p.name === 'v-if'),
        hasVFor: descriptor.template?.props?.some((p: { name: string }) => p.name === 'v-for'),
        hasVShow: descriptor.template?.props?.some((p: { name: string }) => p.name === 'v-show'),
      },
    };

    return { type: 'componentInfo', path, info };
  } catch (err) {
    logger.error('Failed to get component info:', err);
    return { type: 'componentInfo', path, info: null };
  }
}

function handleReorderElement(
  path: VueStructuralPath,
  fromIndex: number,
  toIndex: number,
  context: MessageContext,
  vrId?: string
): ServerMessage {
  if (!isProjectFilePathSafe(path.filePath, context.projectRoot)) {
    return {
      type: 'reorderComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: 'Invalid file path', file: path.filePath },
    };
  }

  if (!vrId) {
    return {
      type: 'reorderComplete',
      path,
      success: false,
      error: { code: 'INVALID_PATH', message: 'Missing vrId', file: path.filePath },
    };
  }

  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'reorderComplete',
        path,
        success: false,
        error: { code: 'FILE_CHANGED', message: 'File not found', file: path.filePath },
      };
    }

    const originalContent = readFileSync(filePath, 'utf-8');
    const { code: modified, success, error } = applySfcReorder(originalContent, vrId, fromIndex, toIndex);
    if (!success) {
      return { type: 'reorderComplete', path, success: false, error: { code: 'FILE_CHANGED', message: error || 'Reorder failed', file: path.filePath } };
    }

    const operationId = `op-${Date.now()}`;
    const backup = new Map([[filePath, originalContent]]);
    operationHistory.set(operationId, {
      operations: [{ type: 'reorder', path, fromIndex, toIndex }],
      timestamp: Date.now(),
      backup,
    });

    writeFileSync(filePath, modified, 'utf-8');
    logger.debug(`Element reordered from ${fromIndex} to ${toIndex} (vrId=${vrId}) for ${path.filePath}`);
    return { type: 'reorderComplete', path, success: true };
  } catch (err) {
    logger.error('Failed to reorder element:', err);
    return {
      type: 'reorderComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: String(err), file: path.filePath },
    };
  }
}

function handleDuplicateElement(
  path: VueStructuralPath,
  context: MessageContext,
  vrId?: string
): ServerMessage {
  if (!isProjectFilePathSafe(path.filePath, context.projectRoot)) {
    return {
      type: 'duplicateComplete',
      path,
      newPath: path,
      success: false,
      error: { code: 'FILE_CHANGED', message: 'Invalid file path', file: path.filePath },
    };
  }

  if (!vrId) {
    return {
      type: 'duplicateComplete',
      path,
      newPath: path,
      success: false,
      error: { code: 'INVALID_PATH', message: 'Missing vrId', file: path.filePath },
    };
  }

  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'duplicateComplete',
        path,
        newPath: path,
        success: false,
        error: { code: 'FILE_CHANGED', message: 'File not found', file: path.filePath },
      };
    }

    const originalContent = readFileSync(filePath, 'utf-8');
    const newVrId = `vr-${Date.now().toString(36)}-dup`;
    const { code: modified, success, error } = applySfcDuplicate(originalContent, vrId, newVrId);
    if (!success) {
      return { type: 'duplicateComplete', path, newPath: path, success: false, error: { code: 'FILE_CHANGED', message: error || 'Duplicate failed', file: path.filePath } };
    }

    const operationId = `op-${Date.now()}`;
    const backup = new Map([[filePath, originalContent]]);
    operationHistory.set(operationId, {
      operations: [{ type: 'duplicate', path }],
      timestamp: Date.now(),
      backup,
    });

    writeFileSync(filePath, modified, 'utf-8');
    logger.debug(`Element duplicated (vrId=${vrId} → ${newVrId}) for ${path.filePath}`);
    return { type: 'duplicateComplete', path, newPath: path, success: true };
  } catch (err) {
    logger.error('Failed to duplicate element:', err);
    return {
      type: 'duplicateComplete',
      path,
      newPath: path,
      success: false,
      error: { code: 'FILE_CHANGED', message: String(err), file: path.filePath },
    };
  }
}

function handleDeleteElement(
  path: VueStructuralPath,
  context: MessageContext,
  vrId?: string
): ServerMessage {
  if (!isProjectFilePathSafe(path.filePath, context.projectRoot)) {
    return {
      type: 'deleteComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: 'Invalid file path', file: path.filePath },
    };
  }

  if (!vrId) {
    return {
      type: 'deleteComplete',
      path,
      success: false,
      error: { code: 'INVALID_PATH', message: 'Missing vrId', file: path.filePath },
    };
  }

  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'deleteComplete',
        path,
        success: false,
        error: { code: 'FILE_CHANGED', message: 'File not found', file: path.filePath },
      };
    }

    const originalContent = readFileSync(filePath, 'utf-8');
    const { code: modified, success, error } = applySfcDelete(originalContent, vrId);
    if (!success) {
      return { type: 'deleteComplete', path, success: false, error: { code: 'FILE_CHANGED', message: error || 'Delete failed', file: path.filePath } };
    }

    const operationId = `op-${Date.now()}`;
    const backup = new Map([[filePath, originalContent]]);
    operationHistory.set(operationId, {
      operations: [{ type: 'delete', path }],
      timestamp: Date.now(),
      backup,
    });

    writeFileSync(filePath, modified, 'utf-8');
    logger.debug(`Element deleted (vrId=${vrId}) for ${path.filePath}`);
    return { type: 'deleteComplete', path, success: true };
  } catch (err) {
    logger.error('Failed to delete element:', err);
    return {
      type: 'deleteComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: String(err), file: path.filePath },
    };
  }
}

function handleSetClassBinding(
  path: VueStructuralPath,
  bindingType: 'static' | 'dynamic' | 'object' | 'array',
  value: string,
  context: MessageContext,
  vrId?: string
): ServerMessage {
  if (!isProjectFilePathSafe(path.filePath, context.projectRoot)) {
    return {
      type: 'classBindingComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: 'Invalid file path', file: path.filePath },
    };
  }

  if (!vrId) {
    return {
      type: 'classBindingComplete',
      path,
      success: false,
      error: { code: 'INVALID_PATH', message: 'Missing vrId', file: path.filePath },
    };
  }

  try {
    const filePath = resolve(context.projectRoot, path.filePath);
    if (!existsSync(filePath)) {
      return {
        type: 'classBindingComplete',
        path,
        success: false,
        error: { code: 'FILE_CHANGED', message: 'File not found', file: path.filePath },
      };
    }

    const originalContent = readFileSync(filePath, 'utf-8');
    const { code: modified, success, error } = applySfcClassBinding(originalContent, vrId, bindingType, value);
    if (!success) {
      return { type: 'classBindingComplete', path, success: false, error: { code: 'FILE_CHANGED', message: error || 'Binding failed', file: path.filePath } };
    }

    const operationId = `op-${Date.now()}`;
    const backup = new Map([[filePath, originalContent]]);
    operationHistory.set(operationId, {
      operations: [{ type: 'setClassBinding', path, bindingType, value }],
      timestamp: Date.now(),
      backup,
    });

    writeFileSync(filePath, modified, 'utf-8');
    logger.debug(`Class binding set (${bindingType}=${value}) for vrId=${vrId} in ${path.filePath}`);
    return { type: 'classBindingComplete', path, success: true };
  } catch (err) {
    logger.error('Failed to set class binding:', err);
    return {
      type: 'classBindingComplete',
      path,
      success: false,
      error: { code: 'FILE_CHANGED', message: String(err), file: path.filePath },
    };
  }
}
