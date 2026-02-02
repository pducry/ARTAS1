/**
 * AnimationHelpers.js
 * Utility functions for animations and easing
 */

/**
 * Easing functions
 */
export const Easing = {
  // Linear
  linear: (t) => t,
  
  // Quadratic
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quartic
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Quintic
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  // Sine
  easeInSine: (t) => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: (t) => Math.sin(t * Math.PI / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // Exponential
  easeInExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Circular
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t) => t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  
  // Elastic
  easeInElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
  },
  easeOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  
  // Back
  easeInBack: (t) => {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  },
  easeOutBack: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
  
  // Bounce
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInBounce: (t) => 1 - Easing.easeOutBounce(1 - t)
};

/**
 * Animate a value over time
 */
export function animate(options) {
  const {
    from = 0,
    to = 1,
    duration = 1000,
    easing = Easing.easeInOutQuad,
    onUpdate,
    onComplete
  } = options;
  
  const startTime = performance.now();
  
  function tick(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    const currentValue = from + (to - from) * easedProgress;
    
    if (onUpdate) {
      onUpdate(currentValue, progress);
    }
    
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onComplete) {
      onComplete();
    }
  }
  
  requestAnimationFrame(tick);
}

/**
 * Animate multiple values
 */
export function animateMultiple(options) {
  const {
    values, // { key: { from, to } }
    duration = 1000,
    easing = Easing.easeInOutQuad,
    onUpdate,
    onComplete
  } = options;
  
  const startTime = performance.now();
  const keys = Object.keys(values);
  
  function tick(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    
    const currentValues = {};
    for (const key of keys) {
      const { from, to } = values[key];
      currentValues[key] = from + (to - from) * easedProgress;
    }
    
    if (onUpdate) {
      onUpdate(currentValues, progress);
    }
    
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onComplete) {
      onComplete();
    }
  }
  
  requestAnimationFrame(tick);
}

/**
 * Interpolate between two values
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Smooth step interpolation
 */
export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Map a value from one range to another
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Debounce a function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Create a spring animation
 */
export function spring(options) {
  const {
    from = 0,
    to = 1,
    stiffness = 100,
    damping = 10,
    mass = 1,
    onUpdate,
    onComplete
  } = options;
  
  let position = from;
  let velocity = 0;
  let lastTime = performance.now();
  
  function tick(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // Spring physics
    const displacement = position - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;
    
    velocity += acceleration * deltaTime;
    position += velocity * deltaTime;
    
    if (onUpdate) {
      onUpdate(position);
    }
    
    // Check if settled
    const isSettled = Math.abs(velocity) < 0.001 && Math.abs(displacement) < 0.001;
    
    if (!isSettled) {
      requestAnimationFrame(tick);
    } else {
      position = to;
      if (onUpdate) onUpdate(position);
      if (onComplete) onComplete();
    }
  }
  
  requestAnimationFrame(tick);
}

/**
 * Create a delayed promise
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Frame-rate independent delta time calculator
 */
export class DeltaTime {
  constructor() {
    this.lastTime = performance.now();
    this.delta = 0;
    this.elapsed = 0;
  }
  
  update() {
    const currentTime = performance.now();
    this.delta = (currentTime - this.lastTime) / 1000;
    this.elapsed += this.delta;
    this.lastTime = currentTime;
    return this.delta;
  }
  
  getDelta() {
    return this.delta;
  }
  
  getElapsed() {
    return this.elapsed;
  }
  
  reset() {
    this.lastTime = performance.now();
    this.delta = 0;
    this.elapsed = 0;
  }
}
