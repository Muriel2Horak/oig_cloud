import { oigLog } from './logger';

type LifecycleHook = () => void | Promise<void>;

interface LifecycleState {
  mounted: boolean;
  destroyed: boolean;
}

export class Lifecycle {
  private onMountHooks: LifecycleHook[] = [];
  private onUnmountHooks: LifecycleHook[] = [];
  private state: LifecycleState = { mounted: false, destroyed: false };
  private intervals: number[] = [];
  private timeouts: number[] = [];
  private eventListeners: Array<{ target: EventTarget; event: string; handler: any }> = [];

  onMount(hook: LifecycleHook): void {
    if (this.state.mounted) {
      Promise.resolve(hook()).catch(e => oigLog.error('onMount hook failed', e as Error));
    } else {
      this.onMountHooks.push(hook);
    }
  }

  onUnmount(hook: LifecycleHook): void {
    this.onUnmountHooks.push(hook);
  }

  async mount(): Promise<void> {
    if (this.state.mounted) {
      oigLog.warn('Lifecycle already mounted');
      return;
    }

    oigLog.debug('Lifecycle mounting');
    
    for (const hook of this.onMountHooks) {
      try {
        await hook();
      } catch (e) {
        oigLog.error('onMount hook failed', e as Error);
      }
    }
    
    this.state.mounted = true;
    oigLog.debug('Lifecycle mounted');
  }

  async unmount(): Promise<void> {
    if (!this.state.mounted || this.state.destroyed) {
      return;
    }

    oigLog.debug('Lifecycle unmounting');
    
    this.clearAllTimers();
    this.removeAllEventListeners();
    
    for (const hook of this.onUnmountHooks) {
      try {
        await hook();
      } catch (e) {
        oigLog.error('onUnmount hook failed', e as Error);
      }
    }
    
    this.state.destroyed = true;
    oigLog.debug('Lifecycle unmounted');
  }

  setInterval(callback: () => void, delay: number): number {
    const id = window.setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  }

  clearInterval(id: number): void {
    window.clearInterval(id);
    const idx = this.intervals.indexOf(id);
    if (idx > -1) this.intervals.splice(idx, 1);
  }

  setTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(() => {
      const idx = this.timeouts.indexOf(id);
      if (idx > -1) this.timeouts.splice(idx, 1);
      callback();
    }, delay);
    this.timeouts.push(id);
    return id;
  }

  clearTimeout(id: number): void {
    window.clearTimeout(id);
    const idx = this.timeouts.indexOf(id);
    if (idx > -1) this.timeouts.splice(idx, 1);
  }

  addEventListener(target: EventTarget, event: string, handler: any): void {
    target.addEventListener(event, handler);
    this.eventListeners.push({ target, event, handler });
  }

  removeEventListener(target: EventTarget, event: string, handler: any): void {
    target.removeEventListener(event, handler);
    const idx = this.eventListeners.findIndex(
      l => l.target === target && l.event === event && l.handler === handler
    );
    if (idx > -1) this.eventListeners.splice(idx, 1);
  }

  private clearAllTimers(): void {
    this.intervals.forEach(id => window.clearInterval(id));
    this.timeouts.forEach(id => window.clearTimeout(id));
    this.intervals = [];
    this.timeouts = [];
  }

  private removeAllEventListeners(): void {
    this.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
}

export function createLifecycle(): Lifecycle {
  return new Lifecycle();
}
