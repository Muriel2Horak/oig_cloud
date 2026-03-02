export type EasingFunction = (t: number) => number;

export const ease: Record<string, EasingFunction> = {
  linear: (t: number) => t,
  
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => 
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => 
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

export interface AnimationOptions {
  duration: number;
  easing?: EasingFunction;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export function animate(options: AnimationOptions): () => void {
  const { duration, easing = ease.linear, onStart, onUpdate, onComplete } = options;
  
  let startTime: number | null = null;
  let animationId: number | null = null;
  let cancelled = false;
  
  const tick = (timestamp: number) => {
    if (cancelled) return;
    
    if (startTime === null) {
      startTime = timestamp;
      onStart?.();
    }
    
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    
    onUpdate?.(easedProgress);
    
    if (progress < 1) {
      animationId = requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  };
  
  animationId = requestAnimationFrame(tick);
  
  return () => {
    cancelled = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}

export function interpolate(
  start: number,
  end: number,
  progress: number
): number {
  return start + (end - start) * progress;
}

export function interpolateArray(
  start: number[],
  end: number[],
  progress: number
): number[] {
  return start.map((s, i) => interpolate(s, end[i], progress));
}
