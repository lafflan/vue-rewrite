import { readFileSync, existsSync } from 'fs';
import { join as pathJoin } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import type { TailwindTokenMap } from '@vue-rewrite/shared';

const DEFAULT_TOKENS: TailwindTokenMap = {
  spacing: {
    '0': '0px', '1': '4px', '2': '8px', '3': '12px', '4': '16px',
    '5': '20px', '6': '24px', '8': '32px', '10': '40px', '12': '48px',
    '16': '64px', '20': '80px', '24': '96px', '32': '128px',
  },
  spacingReverse: {},
  colors: {
    'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
    'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
    'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
    'slate-900': '#0f172a',
    'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
    'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6',
    'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af',
    'blue-900': '#1e3a8a',
  },
  colorsReverse: {},
  fontSize: {
    'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem',
    'xl': '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
  },
  fontSizeReverse: {},
  fontFamily: {
    'sans': 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    'serif': 'ui-serif, Georgia, Cambria', 'mono': 'ui-monospace, SFMono-Regular, Menlo',
  },
  fontWeight: {
    'normal': '400', 'medium': '500', 'semibold': '600', 'bold': '700',
  },
  lineHeight: {
    'none': '1', 'tight': '1.25', 'snug': '1.375', 'normal': '1.5',
    'relaxed': '1.625', 'loose': '2',
  },
  letterSpacing: {
    'tighter': '-0.05em', 'tight': '-0.025em', 'normal': '0em',
    'wide': '0.025em', 'wider': '0.05em',
  },
  borderRadius: {
    'none': '0px', 'sm': '0.125rem', 'DEFAULT': '0.25rem', 'md': '0.375rem',
    'lg': '0.5rem', 'xl': '0.75rem', '2xl': '1rem', 'full': '9999px',
  },
  borderRadiusReverse: {},
  borderWidth: { '0': '0px', '1': '1px', '2': '2px', '4': '4px', '8': '8px' },
  width: {}, height: {}, maxWidth: {}, maxHeight: {},
  minWidth: {}, minHeight: {}, padding: {}, margin: {}, gap: {},
};

function buildReverseMaps(tokens: TailwindTokenMap): void {
  for (const [key, value] of Object.entries(tokens.spacing)) {
    tokens.spacingReverse[value] = key;
  }
  for (const [key, value] of Object.entries(tokens.colors)) {
    tokens.colorsReverse[value] = key;
  }
  for (const [key, value] of Object.entries(tokens.fontSize)) {
    tokens.fontSizeReverse[value] = key;
  }
  for (const [key, value] of Object.entries(tokens.borderRadius)) {
    if (key !== 'DEFAULT') tokens.borderRadiusReverse[value] = key;
  }
  tokens.width = { ...tokens.spacing };
  tokens.height = { ...tokens.spacing };
  tokens.minWidth = { ...tokens.spacing };
  tokens.minHeight = { ...tokens.spacing };
  tokens.maxWidth = { ...tokens.spacing };
  tokens.maxHeight = { ...tokens.spacing };
  tokens.padding = { ...tokens.spacing };
  tokens.margin = { ...tokens.spacing };
  tokens.gap = { ...tokens.spacing };
}

buildReverseMaps(DEFAULT_TOKENS);

function loadTheme(projectRoot: string, customConfigPath?: string): Record<string, unknown> | null {
  const configPath = customConfigPath || pathJoin(projectRoot, 'tailwind.config.js');
  if (!existsSync(configPath)) return null;

  try {
    const require = createRequire(fileURLToPath(import.meta.url));
    const config: any = require(configPath);
    const theme = config?.theme || config?.default?.theme || {};
    return { ...theme, ...config?.extend };
  } catch {
    return null;
  }
}

export function tailwindResolver(
  projectRoot: string,
  customConfigPath?: string
): TailwindTokenMap {
  const tokens: TailwindTokenMap = JSON.parse(JSON.stringify(DEFAULT_TOKENS));
  const theme = loadTheme(projectRoot, customConfigPath);

  if (theme) {
    const t = theme as Record<string, Record<string, unknown>>;

    if (t.spacing) {
      for (const [k, v] of Object.entries(t.spacing)) {
        if (typeof v === 'string') tokens.spacing[k] = v;
      }
    }
    if (t.colors) {
      for (const [k, v] of Object.entries(t.colors)) {
        if (typeof v === 'string') tokens.colors[k] = v;
        else if (typeof v === 'object' && v !== null) {
          for (const [subK, subV] of Object.entries(v as Record<string, unknown>)) {
            if (typeof subV === 'string') tokens.colors[`${k}-${subK}`] = subV;
          }
        }
      }
    }
    if (t.fontSize) {
      for (const [k, v] of Object.entries(t.fontSize)) {
        if (typeof v === 'string') tokens.fontSize[k] = v;
        else if (Array.isArray(v) && typeof v[0] === 'string') tokens.fontSize[k] = v[0] as string;
        else if (typeof v === 'object' && v !== null) tokens.fontSize[k] = String((v as any).to ?? v);
      }
    }
    if (t.fontFamily) {
      for (const [k, v] of Object.entries(t.fontFamily)) {
        if (typeof v === 'string') tokens.fontFamily[k] = v;
        else if (Array.isArray(v) && typeof v[0] === 'string') tokens.fontFamily[k] = v[0] as string;
      }
    }
    if (t.borderRadius) {
      for (const [k, v] of Object.entries(t.borderRadius)) {
        if (typeof v === 'string') tokens.borderRadius[k] = v;
        else if (typeof v === 'object' && v !== null) tokens.borderRadius[k] = String((v as any).DEFAULT ?? (v as any).value ?? v);
      }
    }
    if (t.borderWidth) {
      for (const [k, v] of Object.entries(t.borderWidth)) {
        if (typeof v === 'string' || typeof v === 'number') tokens.borderWidth[k] = String(v);
      }
    }
  }

  buildReverseMaps(tokens);
  tokens.width = { ...tokens.spacing };
  tokens.height = { ...tokens.spacing };
  tokens.minWidth = { ...tokens.spacing };
  tokens.minHeight = { ...tokens.spacing };
  tokens.maxWidth = { ...tokens.spacing };
  tokens.maxHeight = { ...tokens.spacing };
  tokens.padding = { ...tokens.spacing };
  tokens.margin = { ...tokens.spacing };
  tokens.gap = { ...tokens.spacing };

  return tokens;
}
