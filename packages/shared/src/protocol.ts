import type {
  VueStructuralPath,
  BatchOperation,
  ComponentInfo,
  TailwindTokenMap,
  TransformError,
  FileDiscoveryResult,
  FileStatResult,
} from './types.js';

// Client -> Server Messages
export type ClientMessage =
  | { type: 'ping' }
  | { type: 'getSiblings'; path: VueStructuralPath }
  | { type: 'undo'; operationId: string }
  | { type: 'updateProperty'; path: VueStructuralPath; property: string; value: string; vrId?: string }
  | { type: 'updateProperties'; operations: Array<{ path: VueStructuralPath; property: string; value: string; vrId?: string }> }
  | { type: 'updateText'; path: VueStructuralPath; text: string; vrId?: string }
  | { type: 'revertChanges'; operationId: string }
  | { type: 'discoverFile'; componentName: string }
  | { type: 'commitBatch'; operations: BatchOperation[] }
  | { type: 'fileStat'; filePath: string }
  | { type: 'getComponentInfo'; path: VueStructuralPath }
  | { type: 'reorderElement'; path: VueStructuralPath; fromIndex: number; toIndex: number; vrId?: string }
  | { type: 'duplicateElement'; path: VueStructuralPath; vrId?: string }
  | { type: 'deleteElement'; path: VueStructuralPath; vrId?: string }
  | { type: 'setClassBinding'; path: VueStructuralPath; bindingType: 'static' | 'dynamic' | 'object' | 'array'; value: string; vrId?: string };

// Server -> Client Messages
export type ServerMessage =
  | { type: 'pong' }
  | { type: 'siblingsList'; path: VueStructuralPath; siblings: string[] }
  | { type: 'undoComplete'; operationId: string; success: boolean }
  | { type: 'undoFailed'; operationId: string; error: string }
  | { type: 'updatePropertyComplete'; path: VueStructuralPath; property: string; success: boolean; error?: TransformError }
  | { type: 'updateTextComplete'; path: VueStructuralPath; success: boolean; error?: TransformError }
  | { type: 'revertComplete'; operationId: string; success: boolean }
  | { type: 'revertFailed'; operationId: string; error: string }
  | { type: 'tailwindTokens'; tokens: TailwindTokenMap }
  | { type: 'discoverFileResult'; result: FileDiscoveryResult }
  | { type: 'commitBatchComplete'; operationId: string; success: boolean; error?: TransformError }
  | { type: 'fileStatResult'; result: FileStatResult }
  | { type: 'componentInfo'; path: VueStructuralPath; info: ComponentInfo | null }
  | { type: 'reorderComplete'; path: VueStructuralPath; success: boolean; error?: TransformError }
  | { type: 'duplicateComplete'; path: VueStructuralPath; newPath: VueStructuralPath; success: boolean; error?: TransformError }
  | { type: 'deleteComplete'; path: VueStructuralPath; success: boolean; error?: TransformError }
  | { type: 'classBindingComplete'; path: VueStructuralPath; success: boolean; error?: TransformError }
  | { type: 'devServerDisconnected' }
  | { type: 'devServerReconnected' }
  | { type: 'error'; message: string };

// Message type guards
export function isClientMessage(msg: unknown): msg is ClientMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}

export function isServerMessage(msg: unknown): msg is ServerMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}
