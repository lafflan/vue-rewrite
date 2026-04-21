import { resolve, isAbsolute, join, relative } from 'path';
import { existsSync } from 'fs';

export function resolveProjectFilePath(filePath: string, projectRoot: string): string | null {
  try {
    // Absolute path check
    if (isAbsolute(filePath)) {
      const resolved = resolve(filePath);
      if (!resolved.startsWith(projectRoot)) {
        return null; // Path traversal attempt
      }
      return existsSync(resolved) ? resolved : null;
    }

    // Relative path - resolve from project root
    const resolved = resolve(projectRoot, filePath);
    if (!resolved.startsWith(projectRoot)) {
      return null; // Path traversal attempt
    }
    return existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

export function isProjectFilePathSafe(filePath: string, projectRoot: string): boolean {
  return resolveProjectFilePath(filePath, projectRoot) !== null;
}

export function getRelativePath(filePath: string, projectRoot: string): string {
  return relative(projectRoot, filePath);
}
