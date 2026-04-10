import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OigConfirmDialog } from '@/ui/features/control-panel/confirm-dialog';

type DialogMethodName =
  | 'onAckChange'
  | 'onConfirm'
  | 'onCancel'
  | 'onOverlayClick'
  | 'onKeyDown'
  | 'onLimitInput'
  | 'onDialogClick';

function getDialogValue(dialog: OigConfirmDialog, key: string): unknown {
  return Reflect.get(dialog, key);
}

function setDialogValue(dialog: OigConfirmDialog, key: string, value: unknown): void {
  Reflect.set(dialog, key, value);
}

function callDialogMethod(dialog: OigConfirmDialog, name: DialogMethodName, ...args: unknown[]): unknown {
  const method = Reflect.get(dialog, name);
  if (typeof method !== 'function') {
    throw new Error(`Missing dialog method: ${name}`);
  }
  return Reflect.apply(method, dialog, args);
}

function createEventWithTarget<T extends EventTarget>(target: T): Event {
  return { target } as unknown as Event;
}

function applyRenderHTML(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.innerHTML = text;
  return span;
}

describe('renderHTML — acknowledgementText HTML parsing', () => {
  it('parses <strong> tag into a DOM element, not visible text', () => {
    const text = '<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost.';
    const span = applyRenderHTML(text);

    const strong = span.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('Souhlasím');

    expect(span.textContent).not.toContain('<strong>');
    expect(span.textContent).not.toContain('</strong>');
  });

  it('does not expose literal HTML angle-bracket sequences in textContent', () => {
    const text = '<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.';
    const span = applyRenderHTML(text);

    expect(span.textContent).not.toMatch(/<[^>]+>/);
  });

  it('preserves plain text when no HTML tags are present', () => {
    const plain = 'Souhlasím s podmínkami.';
    const span = applyRenderHTML(plain);
    expect(span.textContent).toBe(plain);
    expect(span.querySelector('strong')).toBeNull();
  });

  it('handles multiple HTML elements correctly', () => {
    const text = '<strong>Bold</strong> and <em>italic</em> text.';
    const span = applyRenderHTML(text);

    expect(span.querySelector('strong')).not.toBeNull();
    expect(span.querySelector('em')).not.toBeNull();
    expect(span.textContent).not.toContain('<strong>');
    expect(span.textContent).not.toContain('<em>');
    expect(span.textContent).toContain('Bold');
    expect(span.textContent).toContain('italic');
  });
});

describe('OigConfirmDialog — acknowledgementText rendering path', () => {
  const ACK_TEXT_FROM_PANEL =
    '<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.';

  it('acknowledgementText from panel.ts does NOT produce literal <strong> in text output', () => {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.innerHTML = ACK_TEXT_FROM_PANEL;
    label.appendChild(span);

    expect(label.textContent).not.toContain('<strong>');
    expect(label.textContent).not.toContain('</strong>');
  });

  it('acknowledgementText renders "Souhlasím" inside a <strong> DOM element', () => {
    const container = document.createElement('div');
    container.innerHTML = ACK_TEXT_FROM_PANEL;

    const strongEl = container.querySelector('strong');
    expect(strongEl).not.toBeNull();
    expect(strongEl!.textContent).toBe('Souhlasím');
  });

  it('plain-text fallback contains no angle-bracket sequences', () => {
    const fallbackText = 'Souhlasím s tím, že měním nastavení na vlastní odpovědnost.';
    const label = document.createElement('label');
    label.textContent = fallbackText;

    expect(label.textContent).not.toMatch(/<[^>]+>/);
    expect(label.textContent).toContain('Souhlasím');
  });
});

describe('OigConfirmDialog — showDialog API', () => {
  let el: OigConfirmDialog;

  beforeEach(() => {
    el = new OigConfirmDialog();
  });

  it('starts closed with defaults', () => {
    expect(el.open).toBe(false);
    expect(getDialogValue(el, 'acknowledged')).toBe(false);
    expect(getDialogValue(el, 'limitValue')).toBe(5000);
  });

  it('showDialog opens the dialog and returns a Promise', () => {
    const result = el.showDialog({ title: 'Potvrdit', message: 'Opravdu?' });
    expect(el.open).toBe(true);
    expect(result).toBeInstanceOf(Promise);
  });

  it('showDialog resets acknowledged to false on each call', () => {
    setDialogValue(el, 'acknowledged', true);
    el.showDialog({ title: 'X', message: 'Y' });
    expect(getDialogValue(el, 'acknowledged')).toBe(false);
  });

  it('showDialog uses provided limitValue instead of default 5000', () => {
    el.showDialog({ title: 'X', message: 'Y', limitValue: 3000 });
    expect(getDialogValue(el, 'limitValue')).toBe(3000);
  });

  it('showDialog falls back to 5000 when limitValue is undefined', () => {
    el.showDialog({ title: 'X', message: 'Y' });
    expect(getDialogValue(el, 'limitValue')).toBe(5000);
  });
});

describe('OigConfirmDialog — acknowledgement gating (canConfirm)', () => {
  let el: OigConfirmDialog;

  beforeEach(() => {
    el = new OigConfirmDialog();
  });

  it('canConfirm is true when requireAcknowledgement is absent', () => {
    el.showDialog({ title: 'X', message: 'Y' });
    expect(getDialogValue(el, 'canConfirm')).toBe(true);
  });

  it('canConfirm is true when requireAcknowledgement is false', () => {
    el.showDialog({ title: 'X', message: 'Y', requireAcknowledgement: false });
    expect(getDialogValue(el, 'canConfirm')).toBe(true);
  });

  it('canConfirm is false when requireAcknowledgement is true and not yet acknowledged', () => {
    el.showDialog({ title: 'X', message: 'Y', requireAcknowledgement: true });
    expect(getDialogValue(el, 'canConfirm')).toBe(false);
  });

  it('canConfirm becomes true once acknowledged is set', () => {
    el.showDialog({ title: 'X', message: 'Y', requireAcknowledgement: true });
    setDialogValue(el, 'acknowledged', true);
    expect(getDialogValue(el, 'canConfirm')).toBe(true);
  });

  it('onAckChange sets acknowledged=true from a checked checkbox event', () => {
    el.showDialog({ title: 'X', message: 'Y', requireAcknowledgement: true });
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox', checked: true });
    callDialogMethod(el, 'onAckChange', createEventWithTarget(checkbox));
    expect(getDialogValue(el, 'acknowledged')).toBe(true);
  });

  it('onAckChange sets acknowledged=false from an unchecked checkbox event', () => {
    setDialogValue(el, 'acknowledged', true);
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox', checked: false });
    callDialogMethod(el, 'onAckChange', createEventWithTarget(checkbox));
    expect(getDialogValue(el, 'acknowledged')).toBe(false);
  });
});

describe('OigConfirmDialog — confirm/cancel resolution', () => {
  let el: OigConfirmDialog;

  beforeEach(() => {
    el = new OigConfirmDialog();
  });

  it('onConfirm resolves with confirmed=true and closes dialog', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onConfirm');
    const result = await p;
    expect(result.confirmed).toBe(true);
    expect(el.open).toBe(false);
  });

  it('onConfirm does not include limit when showLimitInput is absent', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onConfirm');
    const result = await p;
    expect(result.limit).toBeUndefined();
  });

  it('onCancel resolves with confirmed=false and closes dialog', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onCancel');
    const result = await p;
    expect(result.confirmed).toBe(false);
    expect(el.open).toBe(false);
  });

  it('onOverlayClick resolves with confirmed=false', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onOverlayClick');
    const result = await p;
    expect(result.confirmed).toBe(false);
  });

  it('resolver is nulled after dialog closes', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onCancel');
    await p;
    expect(getDialogValue(el, 'resolver')).toBeNull();
  });
});

describe('OigConfirmDialog — escape key close path', () => {
  let el: OigConfirmDialog;

  beforeEach(() => {
    el = new OigConfirmDialog();
  });

  it('Escape key closes an open dialog with confirmed=false', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onKeyDown', new KeyboardEvent('keydown', { key: 'Escape' }));
    const result = await p;
    expect(result.confirmed).toBe(false);
    expect(el.open).toBe(false);
  });

  it('Escape key does nothing when dialog is not open', () => {
    expect(() => {
      callDialogMethod(el, 'onKeyDown', new KeyboardEvent('keydown', { key: 'Escape' }));
    }).not.toThrow();
    expect(el.open).toBe(false);
  });

  it('non-Escape keydown leaves dialog open', async () => {
    let enterCausedClose = false;
    const p = el.showDialog({ title: 'X', message: 'Y' });
    callDialogMethod(el, 'onKeyDown', new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(el.open).toBe(true);
    enterCausedClose = !el.open;
    callDialogMethod(el, 'onCancel');
    await p;
    expect(enterCausedClose).toBe(false);
  });
});

describe('OigConfirmDialog — limit input validation', () => {
  let el: OigConfirmDialog;

  beforeEach(() => {
    el = new OigConfirmDialog();
  });

  it('onLimitInput parses a valid integer from input value', () => {
    el.showDialog({ title: 'X', message: 'Y', showLimitInput: true });
    const input = Object.assign(document.createElement('input'), { value: '7500' });
    callDialogMethod(el, 'onLimitInput', createEventWithTarget(input));
    expect(getDialogValue(el, 'limitValue')).toBe(7500);
  });

  it('onLimitInput sets limitValue to 0 for non-numeric string', () => {
    el.showDialog({ title: 'X', message: 'Y', showLimitInput: true });
    const input = Object.assign(document.createElement('input'), { value: 'abc' });
    callDialogMethod(el, 'onLimitInput', createEventWithTarget(input));
    expect(getDialogValue(el, 'limitValue')).toBe(0);
  });

  it('onConfirm is blocked when limit is below min', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y', showLimitInput: true, limitMin: 100, limitMax: 10000 });
    setDialogValue(el, 'limitValue', 0);
    callDialogMethod(el, 'onConfirm');

    let resolved = false;
    p.then(() => { resolved = true; });
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(false);
    expect(el.open).toBe(true);

    callDialogMethod(el, 'onCancel');
    await p;
  });

  it('onConfirm is blocked when limit is above max', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y', showLimitInput: true, limitMin: 1, limitMax: 5000 });
    setDialogValue(el, 'limitValue', 9999);
    callDialogMethod(el, 'onConfirm');

    let resolved = false;
    p.then(() => { resolved = true; });
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(false);
    expect(el.open).toBe(true);

    callDialogMethod(el, 'onCancel');
    await p;
  });

  it('onConfirm resolves with confirmed=true and the limit value when in range', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y', showLimitInput: true, limitMin: 1, limitMax: 10000 });
    setDialogValue(el, 'limitValue', 5000);
    callDialogMethod(el, 'onConfirm');
    const result = await p;
    expect(result.confirmed).toBe(true);
    expect(result.limit).toBe(5000);
  });

  it('onConfirm uses default min=1 and max=20000 when not specified in config', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y', showLimitInput: true });
    setDialogValue(el, 'limitValue', 15000);
    callDialogMethod(el, 'onConfirm');
    const result = await p;
    expect(result.confirmed).toBe(true);
    expect(result.limit).toBe(15000);
  });

  it('onConfirm is blocked when limitValue is NaN', async () => {
    const p = el.showDialog({ title: 'X', message: 'Y', showLimitInput: true, limitMin: 1, limitMax: 20000 });
    setDialogValue(el, 'limitValue', Number.NaN);
    callDialogMethod(el, 'onConfirm');

    let resolved = false;
    p.then(() => { resolved = true; });
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(false);

    callDialogMethod(el, 'onCancel');
    await p;
  });
});

describe('OigConfirmDialog — onDialogClick stops propagation', () => {
  it('stops event propagation to prevent overlay click from firing', () => {
    const el = new OigConfirmDialog();
    let propagated = true;
    const event = {
      stopPropagation: () => { propagated = false; },
    };
    callDialogMethod(el, 'onDialogClick', event as unknown as Event);
    expect(propagated).toBe(false);
  });
});

describe('OigConfirmDialog — acknowledgementText render branch (lines 342-344)', () => {
  let el: OigConfirmDialog;

  beforeEach(() => {
    el = document.createElement('oig-confirm-dialog') as OigConfirmDialog;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders custom acknowledgementText as real DOM markup — no literal angle-bracket tags visible', async () => {
    el.showDialog({
      title: 'Test',
      message: 'Msg',
      requireAcknowledgement: true,
      acknowledgementText: '<strong>Vlastní souhlas</strong> s podmínkami.',
    });

    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;

    const label = el.shadowRoot!.querySelector('.ack-wrapper label');
    expect(label).not.toBeNull();

    expect(label!.textContent).not.toContain('<strong>');
    expect(label!.textContent).not.toContain('</strong>');
    expect(label!.textContent).toContain('Vlastní souhlas');
  });

  it('renders acknowledgementText strong tag as a DOM element in shadow DOM', async () => {
    el.showDialog({
      title: 'Test',
      message: 'Msg',
      requireAcknowledgement: true,
      acknowledgementText: '<strong>Vlastní souhlas</strong> s podmínkami.',
    });

    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;

    const label = el.shadowRoot!.querySelector('.ack-wrapper label');
    expect(label).not.toBeNull();

    const strongEl = label!.querySelector('strong');
    expect(strongEl).not.toBeNull();
    expect(strongEl!.textContent).toBe('Vlastní souhlas');
  });

  it('renders default acknowledgementText template when acknowledgementText is absent', async () => {
    el.showDialog({
      title: 'Test',
      message: 'Msg',
      requireAcknowledgement: true,
    });

    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;

    const label = el.shadowRoot!.querySelector('.ack-wrapper label');
    expect(label).not.toBeNull();

    const strong = label!.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toContain('Souhlasím');
  });
});
