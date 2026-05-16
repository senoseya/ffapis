import fs from 'fs';
import path from 'path';

function findPackageRoot(): string {
  let current = __dirname;
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(current, 'package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name === 'ffapis') return current;
    } catch {
      // continue
    }
    current = path.dirname(current);
  }
  throw new Error('Could not find ffapis package root. Ensure package.json is present.');
}

const PACKAGE_ROOT = findPackageRoot();

export function resolveProjectFile(relativePath: string): string {
  const fullPath = path.join(PACKAGE_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required file not found: ${fullPath} (resolved from package root: ${PACKAGE_ROOT})`);
  }
  return fullPath;
}

export function resolveProjectDir(relativePath: string): string {
  const fullPath = path.join(PACKAGE_ROOT, relativePath);
  try {
    if (fs.statSync(fullPath).isDirectory()) return fullPath;
  } catch {
    // fall through
  }
  throw new Error(`Required directory not found: ${fullPath} (resolved from package root: ${PACKAGE_ROOT})`);
}
