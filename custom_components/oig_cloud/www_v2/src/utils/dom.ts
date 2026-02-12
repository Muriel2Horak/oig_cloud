export function $(selector: string, root: Element | Document = document): HTMLElement | null {
  return root.querySelector(selector) as HTMLElement | null;
}

export function $$(selector: string, root: Element | Document = document): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector)) as HTMLElement[];
}

export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void {
  target.addEventListener(event, handler as EventListener, options);
  return () => target.removeEventListener(event, handler as EventListener, options);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

export function raf(fn: FrameRequestCallback): number {
  return requestAnimationFrame(fn);
}

export function cancelRaf(id: number): void {
  cancelAnimationFrame(id);
}

export function isVisible(element: Element): boolean {
  if (typeof document === 'undefined') return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
}

export function waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver((_mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}
