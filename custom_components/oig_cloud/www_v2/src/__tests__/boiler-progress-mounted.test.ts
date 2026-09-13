/**
 * The progress strip must be mounted in the composition the tab actually renders.
 *
 * Field miss (2026-09-08): the strip was mounted into `boiler-shell.ts`, its unit
 * tests passed, the component shipped in the bundle - and it never appeared on the
 * tab, because `oig-boiler-shell` is mounted nowhere. The tab is composed in
 * `app.ts`. Component tests cannot see that; this one can.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(resolve(here, '../ui/app.ts'), 'utf8');

describe('boiler progress strip is reachable from the rendered tab', () => {
  it('is mounted in app.ts, next to the tab it belongs to', () => {
    expect(appSource).toContain('<oig-boiler-progress');
  });

  it('receives the progress block, not just a lang', () => {
    const tag = appSource.slice(
      appSource.indexOf('<oig-boiler-progress'),
      appSource.indexOf('</oig-boiler-progress>'),
    );
    expect(tag).toMatch(/\.progress=\$\{/);
  });

  it('sits in the same composition as the other boiler tiles', () => {
    const progressAt = appSource.indexOf('<oig-boiler-progress');
    const tileAt = appSource.indexOf('<oig-boiler-plan-realita-tile');
    expect(progressAt).toBeGreaterThan(-1);
    expect(tileAt).toBeGreaterThan(-1);
    // Same render block: within a few hundred characters of its sibling tile.
    expect(Math.abs(progressAt - tileAt)).toBeLessThan(600);
  });
});
