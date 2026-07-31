/**
 * Boiler M2 core unit 3 — override panel wiring.
 *
 * `OigBoilerOverridePanel` (components.ts) was a pure display shell with zero
 * event bindings. This unit wires it to the override REST endpoint per CONTRACT:
 *   POST   /api/oig_cloud/boiler/{entry_id}/{box_id}/override {ttl_minutes, reason}
 *   DELETE /api/oig_cloud/boiler/{entry_id}/{box_id}/override
 *
 * Coverage: submit -> POST body, cancel -> DELETE, client-side validation
 * (does not call fetch), capability-absent (404) disables the control without
 * disabling on a transient failure, and server response reflected into state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPITyped: vi.fn(),
  },
}));

// Bare side-effect import — `OigBoilerOverridePanel` below is used only in type
// position in this file, and an import used only for types can be elided by the
// compiler, silently dropping the module's `@customElement(...)` registration.
// This import guarantees `components.ts` (and its `customElements.define`) runs.
import '@/ui/features/boiler/components';
import { haClient } from '@/data/ha-client';
import type { OigBoilerOverridePanel } from '@/ui/features/boiler/components';

const mockFetchTyped = haClient.fetchOIGAPITyped as ReturnType<typeof vi.fn>;

function mountPanel(): OigBoilerOverridePanel {
  const el = document.createElement('oig-boiler-override-panel') as OigBoilerOverridePanel;
  el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
  el.currentOverride = { active: false, ttlMinutes: 120, reason: '', capabilityAvailable: true };
  document.body.appendChild(el);
  return el;
}

function shadow(el: OigBoilerOverridePanel): ShadowRoot {
  return el.shadowRoot!;
}

function setInput(el: OigBoilerOverridePanel, testid: string, value: string): void {
  const node = shadow(el).querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | HTMLTextAreaElement;
  node.value = value;
  node.dispatchEvent(new Event('input'));
}

function click(el: OigBoilerOverridePanel, testid: string): void {
  const node = shadow(el).querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement;
  node.click();
}

/** onSubmit/onCancel are async (await a mocked fetch, then set state) but the
 * click handler doesn't return that promise for the test to await directly —
 * two back-to-back `updateComplete`s can resolve before the post-await state
 * change lands. A macrotask boundary guarantees the mocked promise's
 * continuation has run before the next updateComplete is awaited. */
async function flushAsync(el: OigBoilerOverridePanel): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

beforeEach(() => {
  mockFetchTyped.mockReset();
  document.body.innerHTML = '';
});

describe('OigBoilerOverridePanel — submit wiring', () => {
  it('submit posts ttl_minutes/reason to the CONTRACT endpoint', async () => {
    mockFetchTyped.mockResolvedValue({
      ok: true,
      status: 200,
      data: { override: { active: true, until: '2026-07-28T12:00:00Z', reason: 'testing' } },
    });
    const el = mountPanel();
    await el.updateComplete;

    setInput(el, 'override-ttl-input', '60');
    setInput(el, 'override-reason-input', 'testing');
    click(el, 'override-submit-btn');
    await flushAsync(el);

    expect(mockFetchTyped).toHaveBeenCalledWith(
      '/boiler/entry1/2206237016/override',
      { method: 'POST', body: JSON.stringify({ ttl_minutes: 60, reason: 'testing' }) },
    );
  });

  it('reflects the server response (active/reason) into the display after submit', async () => {
    mockFetchTyped.mockResolvedValue({
      ok: true,
      status: 200,
      data: { override: { active: true, until: '2026-07-28T12:00:00Z', reason: 'testing' } },
    });
    const el = mountPanel();
    await el.updateComplete;

    setInput(el, 'override-ttl-input', '60');
    setInput(el, 'override-reason-input', 'testing');
    click(el, 'override-submit-btn');
    await flushAsync(el);

    const html = shadow(el).innerHTML;
    expect(html).toContain('2026-07-28T12:00:00Z');
    expect(html).toContain('testing');
  });
});

describe('OigBoilerOverridePanel — cancel/expire wiring', () => {
  it('cancel button issues a DELETE to the same endpoint', async () => {
    mockFetchTyped.mockResolvedValue({ ok: true, status: 200, data: { override: { active: false } } });
    const el = mountPanel();
    el.currentOverride = { active: true, ttlMinutes: 60, reason: 'existing', capabilityAvailable: true };
    await el.updateComplete;

    click(el, 'override-cancel-btn');
    await flushAsync(el);

    expect(mockFetchTyped).toHaveBeenCalledWith(
      '/boiler/entry1/2206237016/override',
      { method: 'DELETE' },
    );
  });

  it('clears the active badge once the DELETE resolves', async () => {
    // Query the element itself, not innerHTML substring match — the static
    // `.active-badge` CSS rule in the component's <style> block makes any
    // `innerHTML.toContain('active-badge')` check true unconditionally,
    // whether or not the badge element is actually rendered.
    mockFetchTyped.mockResolvedValue({ ok: true, status: 200, data: { override: { active: false } } });
    const el = mountPanel();
    el.currentOverride = { active: true, ttlMinutes: 60, reason: 'existing', capabilityAvailable: true };
    await el.updateComplete;
    expect(shadow(el).querySelector('.active-badge')).toBeTruthy();

    click(el, 'override-cancel-btn');
    await flushAsync(el);

    expect(shadow(el).querySelector('.active-badge')).toBeNull();
  });
});

describe('OigBoilerOverridePanel — client-side validation', () => {
  it('rejects ttl_minutes below 15 and does not call fetch', async () => {
    const el = mountPanel();
    await el.updateComplete;
    setInput(el, 'override-ttl-input', '10');
    setInput(el, 'override-reason-input', 'ok');
    click(el, 'override-submit-btn');
    await el.updateComplete;

    expect(mockFetchTyped).not.toHaveBeenCalled();
    expect(shadow(el).querySelector('[data-testid="override-validation-error"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('rejects ttl_minutes above 720 (CONTRACT bound) and does not call fetch', async () => {
    const el = mountPanel();
    await el.updateComplete;
    setInput(el, 'override-ttl-input', '721');
    setInput(el, 'override-reason-input', 'ok');
    click(el, 'override-submit-btn');
    await el.updateComplete;

    expect(mockFetchTyped).not.toHaveBeenCalled();
  });

  it('rejects reason longer than 200 chars and does not call fetch', async () => {
    const el = mountPanel();
    await el.updateComplete;
    setInput(el, 'override-ttl-input', '60');
    setInput(el, 'override-reason-input', 'x'.repeat(201));
    click(el, 'override-submit-btn');
    await el.updateComplete;

    expect(mockFetchTyped).not.toHaveBeenCalled();
  });

  it('does not silently clamp — an out-of-range value is rejected, not adjusted', async () => {
    const el = mountPanel();
    await el.updateComplete;
    setInput(el, 'override-ttl-input', '900');
    setInput(el, 'override-reason-input', 'ok');
    click(el, 'override-submit-btn');
    await el.updateComplete;

    expect(mockFetchTyped).not.toHaveBeenCalled();
    const errNode = shadow(el).querySelector('[data-testid="override-validation-error"]');
    expect(errNode?.hasAttribute('hidden')).toBe(false);
  });
});

describe('OigBoilerOverridePanel — capability-absent vs transient failure', () => {
  it('a 404 on submit disables the control (capability truly absent)', async () => {
    mockFetchTyped.mockResolvedValue({ ok: false, status: 404, code: 'not_found', error: 'no such route' });
    const el = mountPanel();
    await el.updateComplete;
    setInput(el, 'override-ttl-input', '60');
    setInput(el, 'override-reason-input', 'ok');
    click(el, 'override-submit-btn');
    await flushAsync(el);

    const btn = shadow(el).querySelector('[data-testid="override-submit-btn"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('a transient network failure (status 0) does NOT disable the control', async () => {
    mockFetchTyped.mockResolvedValue({ ok: false, status: 0, code: 'provider_unreachable', error: 'network down' });
    const el = mountPanel();
    await el.updateComplete;
    setInput(el, 'override-ttl-input', '60');
    setInput(el, 'override-reason-input', 'ok');
    click(el, 'override-submit-btn');
    await flushAsync(el);

    const btn = shadow(el).querySelector('[data-testid="override-submit-btn"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(shadow(el).querySelector('[data-testid="override-request-error"]')?.hasAttribute('hidden')).toBe(false);
  });
});
