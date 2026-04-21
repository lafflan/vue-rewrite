import { statSync, existsSync } from 'fs';
import { resolve, isAbsolute } from 'path';

export interface FileStat {
  filePath: string;
  mtime: number;
  size: number;
  exists: boolean;
}

export function getFileStats(filePath: string, projectRoot: string): FileStat {
  let resolvedPath: string;

  if (isAbsolute(filePath)) {
    resolvedPath = filePath;
  } else {
    resolvedPath = resolve(projectRoot, filePath);
  }

  if (!existsSync(resolvedPath)) {
    return {
      filePath: resolvedPath,
      mtime: 0,
      size: 0,
      exists: false,
    };
  }

  try {
    const stat = statSync(resolvedPath);
    return {
      filePath: resolvedPath,
      mtime: stat.mtimeMs,
      size: stat.size,
      exists: true,
    };
  } catch {
    return {
      filePath: resolvedPath,
      mtime: 0,
      size: 0,
      exists: false,
    };
  }
}
