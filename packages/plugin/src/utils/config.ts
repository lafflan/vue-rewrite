import { existsSync } from 'fs';
import { join } from 'path';

export interface VueRewriteConfig {
  enabled: boolean;
  wsPort: number;
  verbose: boolean;
  tailwindConfigPath?: string;
}

const DEFAULT_CONFIG: VueRewriteConfig = {
  enabled: true,
  wsPort: 3457,
  verbose: false,
};

export function resolveVueRewriteConfig(
  projectRoot: string,
  inlineConfig?: Partial<VueRewriteConfig>
): VueRewriteConfig {
  // Check for vue-rewrite.config.js/ts
  const configPaths = [
    join(projectRoot, 'vue-rewrite.config.js'),
    join(projectRoot, 'vue-rewrite.config.ts'),
    join(projectRoot, 'vite-vue-rewrite.config.js'),
    join(projectRoot, 'vite-vue-rewrite.config.ts'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        // Dynamic import - config files are cached after first load
        const config = require(configPath);
        return { ...DEFAULT_CONFIG, ...config.default, ...inlineConfig };
      } catch {
        // Ignore and continue
      }
    }
  }

  return { ...DEFAULT_CONFIG, ...inlineConfig };
}
