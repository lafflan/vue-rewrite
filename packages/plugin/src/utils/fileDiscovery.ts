import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const COMPONENT_EXTENSIONS = ['.vue', '.tsx', '.jsx', '.js'];

export async function discoverFile(
  componentName: string,
  projectRoot: string
): Promise<{ componentName: string; filePath: string | null; isSetupScript: boolean }> {
  // Normalize component name
  const normalizedName = componentName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

  const searchPaths = [
    join(projectRoot, 'src', 'components'),
    join(projectRoot, 'src', 'pages'),
    join(projectRoot, 'src', 'views'),
    join(projectRoot, 'components'),
    join(projectRoot, 'src'),
  ];

  for (const searchPath of searchPaths) {
    const result = searchComponent(searchPath, normalizedName, componentName);
    if (result) {
      return {
        componentName,
        filePath: result,
        isSetupScript: true, // Vue 3 defaults to <script setup>
      };
    }
  }

  return { componentName, filePath: null, isSetupScript: false };
}

function searchComponent(dir: string, normalizedName: string, originalName: string): string | null {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check index file in directory
        for (const ext of COMPONENT_EXTENSIONS) {
          const indexFile = join(fullPath, `index${ext}`);
          const nameWithoutExt = basename(fullPath);
          if (
            (nameWithoutExt.toLowerCase() === normalizedName ||
              nameWithoutExt.toLowerCase() === originalName.toLowerCase()) &&
            isFile(indexFile)
          ) {
            return indexFile;
          }
        }
        // Recurse into subdirectory
        const result = searchComponent(fullPath, normalizedName, originalName);
        if (result) return result;
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (!COMPONENT_EXTENSIONS.includes(ext)) continue;

        const nameWithoutExt = basename(entry.name, ext);
        if (
          nameWithoutExt.toLowerCase() === normalizedName ||
          nameWithoutExt === originalName
        ) {
          return fullPath;
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return null;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
