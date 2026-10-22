import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const unpublishedName = /medical[\s_-]*german/i;

// Inspect every emitted file, including asset filenames and bytes, not just HTML.
// A future accidental mention in copy, CSS, JS, metadata or an asset fails build.
export async function assertLaunchOutputAbsent(directory, relative = '') {
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (unpublishedName.test(name)) throw new Error(`Unpublished product path in output: ${name}`);
    if (entry.isDirectory()) {
      await assertLaunchOutputAbsent(directory, name);
    } else {
      const bytes = await readFile(path.join(directory, name));
      if (unpublishedName.test(bytes.toString('utf8')) || unpublishedName.test(bytes.toString('utf16le'))) {
        throw new Error(`Unpublished product content in output: ${name}`);
      }
    }
  }
}
