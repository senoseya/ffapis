import fs from 'fs';
import path from 'path';

export function resolveProjectFile(relativePath: string): string {
  const candidates = [
    path.join(__dirname, '../../', relativePath),
    path.join(__dirname, '../', relativePath),
    path.join(process.cwd(), relativePath)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

export function resolveProjectDir(relativePath: string): string {
  const candidates = [
    path.join(__dirname, '../../', relativePath),
    path.join(__dirname, '../', relativePath),
    path.join(process.cwd(), relativePath)
  ];
  for (const p of candidates) {
    try {
      if (fs.statSync(p).isDirectory()) return p;
    } catch {
      continue;
    }
  }
  return candidates[0];
}
