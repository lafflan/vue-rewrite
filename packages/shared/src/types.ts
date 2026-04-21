// Vue Component Structural Path - 组件内的元素路径
export interface VuePathSegment {
  name: string;
  discriminator: { type: 'key' } | { type: 'id' } | { type: 'index' } | { type: 'v-for' } | { type: 'root' };
  classHint?: string[];
}

export interface VueStructuralPath {
  componentName: string;
  filePath: string;
  segments: VuePathSegment[];
}

// Batch Operations for source file modifications
export type BatchOperation =
  | { op: 'updateClass'; file: string; path: VueStructuralPath; className: string; action: 'add' | 'remove' }
  | { op: 'updateStaticClass'; file: string; path: VueStructuralPath; className: string }
  | { op: 'removeStaticClass'; file: string; path: VueStructuralPath; className: string }
  | { op: 'updateText'; file: string; path: VueStructuralPath; text: string }
  | { op: 'reorder'; file: string; path: VueStructuralPath; fromIndex: number; toIndex: number }
  | { op: 'moveSpacing'; file: string; path: VueStructuralPath; prop: 'padding' | 'margin'; side: 'top' | 'right' | 'bottom' | 'left'; value: string }
  | { op: 'duplicateElement'; file: string; path: VueStructuralPath }
  | { op: 'deleteElement'; file: string; path: VueStructuralPath }
  | { op: 'setBinding'; file: string; path: VueStructuralPath; binding: string; value: string };

// Class Binding Types for Vue
export type ClassBindingType = 'static' | 'dynamic' | 'object' | 'array';

export interface ClassBinding {
  type: ClassBindingType;
  value: string | Record<string, boolean> | string[];
}

// Component Info extracted from Vue SFC
export interface ComponentInfo {
  id: string;
  name: string;
  filePath: string;
  lineNumber: number;
  isSetupScript: boolean;
  hasScopedStyles: boolean;
  templateContent?: string;
  children: ComponentChild[];
  props: ComponentProps;
}

export interface ComponentChild {
  id: string;
  tagName: string;
  componentName?: string;
  textContent?: string;
  classList: string[];
  inlineStyles: Record<string, string>;
  children: ComponentChild[];
}

export interface ComponentProps {
  hasClassBinding: boolean;
  hasStyleBinding: boolean;
  hasVIf: boolean;
  hasVFor: boolean;
  hasVShow: boolean;
}

// Property Control Types
export type ControlType = 'number-scrub' | 'segmented' | 'color-swatch' | 'box-model' | 'text-input';
export type PropertyGroup = 'layout' | 'spacing' | 'size' | 'typography' | 'background' | 'border';

export interface PropertyDescriptor {
  key: string;
  label: string;
  group: PropertyGroup;
  controlType: ControlType;
  cssProperty: string;
  tailwindPrefix: string;
  tailwindScale: string;
  relatedPrefixes?: string[];
  defaultValue: string;
  enumValues?: EnumOption[];
  min?: number;
  max?: number;
  compound?: boolean;
  compoundGroup?: string;
  standalone?: boolean;
  classPattern?: string;
}

export interface EnumOption {
  label: string;
  value: string;
  icon?: string;
}

// Tailwind Token Map
export interface TailwindTokenMap {
  spacing: Record<string, string>;
  colors: Record<string, string>;
  fontSize: Record<string, string>;
  fontFamily: Record<string, string>;
  fontWeight: Record<string, string>;
  lineHeight: Record<string, string>;
  letterSpacing: Record<string, string>;
  borderRadius: Record<string, string>;
  borderWidth: Record<string, string>;
  width: Record<string, string>;
  height: Record<string, string>;
  maxWidth: Record<string, string>;
  maxHeight: Record<string, string>;
  minWidth: Record<string, string>;
  minHeight: Record<string, string>;
  padding: Record<string, string>;
  margin: Record<string, string>;
  gap: Record<string, string>;
  // Reverse maps
  spacingReverse: Record<string, string>;
  colorsReverse: Record<string, string>;
  fontSizeReverse: Record<string, string>;
  borderRadiusReverse: Record<string, string>;
}

// Annotation for visual overlays
export interface Annotation {
  id: string;
  type: 'text' | 'color-badge' | 'text-edit';
  targetId: string;
  content: string;
  color?: string;
  position: { x: number; y: number };
}

// Undo Action Types
export type CanvasUndoAction =
  | { type: 'move'; targetId: string; fromParent: string; fromIndex: number; toParent: string; toIndex: number }
  | { type: 'clone'; targetId: string; cloneId: string; parentId: string; index: number }
  | { type: 'delete'; targetId: string; parentId: string; index: number; snapshot: string }
  | { type: 'property-change'; targetId: string; property: string; oldValue: string; newValue: string }
  | { type: 'text-change'; targetId: string; oldText: string; newText: string };

// Transform Error Codes
export type TransformErrorCode =
  | 'DYNAMIC_BINDING'
  | 'FILE_CHANGED'
  | 'V-FOR_ELEMENT'
  | 'CONFLICTING_CLASS'
  | 'SCOPED_STYLE'
  | 'INVALID_PATH';

// Error Response
export interface TransformError {
  code: TransformErrorCode;
  message: string;
  file?: string;
  path?: VueStructuralPath;
}

// File Discovery Result
export interface FileDiscoveryResult {
  componentName: string;
  filePath: string | null;
  isSetupScript: boolean;
}

// File Stat Result
export interface FileStatResult {
  filePath: string;
  mtime: number;
  size: number;
  exists: boolean;
}
