/**
 * ContentLoader.js
 * Handles progressive loading of assets with progress tracking
 */

export class ContentLoader {
  constructor(options = {}) {
    this.options = {
      onProgress: null,
      onComplete: null,
      onError: null,
      ...options
    };
    
    this.totalItems = 0;
    this.loadedItems = 0;
    this.progress = 0;
    this.isLoading = false;
    this.loadQueue = [];
  }
  
  /**
   * Add items to the load queue
   */
  addToQueue(items) {
    this.loadQueue.push(...items);
    this.totalItems = this.loadQueue.length;
  }
  
  /**
   * Start loading process
   */
  async start() {
    if (this.isLoading) return;
    this.isLoading = true;
    
    try {
      for (const item of this.loadQueue) {
        await this.loadItem(item);
        this.loadedItems++;
        this.updateProgress();
      }
      
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error);
      }
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Load a single item
   */
  async loadItem(item) {
    switch (item.type) {
      case 'script':
        return this.loadScript(item.url);
      case 'module':
        return this.loadModule(item.url);
      case 'image':
        return this.loadImage(item.url);
      case 'texture':
        return this.loadTexture(item.url);
      case 'delay':
        return this.simulateDelay(item.duration);
      default:
        return Promise.resolve();
    }
  }
  
  /**
   * Load a script
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Load an ES module
   */
  async loadModule(url) {
    return import(url);
  }
  
  /**
   * Load an image
   */
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  /**
   * Load a Three.js texture (placeholder)
   */
  async loadTexture(url) {
    // This would use THREE.TextureLoader in production
    return this.loadImage(url);
  }
  
  /**
   * Simulate loading delay for smoother experience
   */
  simulateDelay(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
  
  /**
   * Update progress and call callback
   */
  updateProgress() {
    this.progress = this.totalItems > 0 
      ? (this.loadedItems / this.totalItems) * 100 
      : 0;
    
    if (this.options.onProgress) {
      this.options.onProgress(this.progress, this.loadedItems, this.totalItems);
    }
  }
  
  /**
   * Get current progress (0-100)
   */
  getProgress() {
    return this.progress;
  }
  
  /**
   * Check if loading is complete
   */
  isComplete() {
    return this.loadedItems >= this.totalItems;
  }
  
  /**
   * Reset loader state
   */
  reset() {
    this.loadQueue = [];
    this.totalItems = 0;
    this.loadedItems = 0;
    this.progress = 0;
    this.isLoading = false;
  }
}

/**
 * Simple loading simulation for the initial experience
 */
export async function simulateLoading(onProgress, duration = 2000) {
  const steps = 20;
  const stepDuration = duration / steps;
  
  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDuration));
    
    // Non-linear progress for more realistic feel
    let progress;
    if (i < steps * 0.3) {
      // Fast start
      progress = (i / steps) * 40;
    } else if (i < steps * 0.7) {
      // Slow middle
      progress = 40 + ((i - steps * 0.3) / (steps * 0.4)) * 30;
    } else {
      // Fast finish
      progress = 70 + ((i - steps * 0.7) / (steps * 0.3)) * 30;
    }
    
    if (onProgress) {
      onProgress(Math.min(progress, 100));
    }
  }
  
  if (onProgress) {
    onProgress(100);
  }
}
