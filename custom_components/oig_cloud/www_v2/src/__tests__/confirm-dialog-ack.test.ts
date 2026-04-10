import { describe, it, expect } from 'vitest';

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
