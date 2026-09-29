/**
 * Small helpers that more than one module needs. Each one used to be
 * copy-pasted into every file that wanted it.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

/** Every file under `dir`, as absolute paths. A missing directory is empty. */
export async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
  } catch {
    return [];
  }
}

/** Escape a string for literal use inside a RegExp. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
