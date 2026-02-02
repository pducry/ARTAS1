/**
 * WebGLDetector.js
 * Detects WebGL support and GPU capabilities
 */

export class WebGLDetector {
  constructor() {
    this.webglSupported = false;
    this.webgl2Supported = false;
    this.webgpuSupported = false;
    this.renderer = null;
    this.vendor = null;
    this.performanceTier = 'unknown';
    
    this.detect();
  }
  
  /**
   * Run all detection checks
   */
  detect() {
    this.webglSupported = this.checkWebGL();
    this.webgl2Supported = this.checkWebGL2();
    this.webgpuSupported = this.checkWebGPU();
    
    if (this.webglSupported || this.webgl2Supported) {
      this.getGPUInfo();
      this.detectPerformanceTier();
    }
  }
  
  /**
   * Check basic WebGL support
   */
  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl') || 
                      canvas.getContext('experimental-webgl');
      return !!context;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Check WebGL 2 support
   */
  checkWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2');
      return !!context;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Check WebGPU support
   */
  checkWebGPU() {
    return 'gpu' in navigator;
  }
  
  /**
   * Get GPU info from debug extension
   */
  getGPUInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return;
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      if (debugInfo) {
        this.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        this.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      } else {
        this.vendor = gl.getParameter(gl.VENDOR);
        this.renderer = gl.getParameter(gl.RENDERER);
      }
    } catch (e) {
      console.warn('Could not get GPU info:', e);
    }
  }
  
  /**
   * Detect performance tier based on GPU
   */
  detectPerformanceTier() {
    const renderer = (this.renderer || '').toLowerCase();
    
    // High-end dedicated GPUs
    const highEndPatterns = [
      'nvidia geforce rtx',
      'nvidia geforce gtx 10',
      'nvidia geforce gtx 16',
      'nvidia geforce gtx 20',
      'nvidia geforce gtx 30',
      'nvidia geforce gtx 40',
      'amd radeon rx 5',
      'amd radeon rx 6',
      'amd radeon rx 7',
      'apple m1 pro',
      'apple m1 max',
      'apple m2',
      'apple m3'
    ];
    
    // Mid-range GPUs
    const midEndPatterns = [
      'nvidia geforce gtx 9',
      'nvidia geforce gtx 1050',
      'nvidia geforce gtx 1060',
      'nvidia geforce mx',
      'amd radeon rx 4',
      'amd radeon pro',
      'apple m1',
      'intel iris xe',
      'intel uhd graphics 7'
    ];
    
    // Low-end / integrated
    const lowEndPatterns = [
      'intel hd graphics',
      'intel uhd graphics 6',
      'intel uhd graphics 5',
      'amd radeon graphics',
      'mali',
      'adreno',
      'powervr',
      'swiftshader'
    ];
    
    // Check patterns
    for (const pattern of highEndPatterns) {
      if (renderer.includes(pattern)) {
        this.performanceTier = 'high';
        return;
      }
    }
    
    for (const pattern of midEndPatterns) {
      if (renderer.includes(pattern)) {
        this.performanceTier = 'medium';
        return;
      }
    }
    
    for (const pattern of lowEndPatterns) {
      if (renderer.includes(pattern)) {
        this.performanceTier = 'low';
        return;
      }
    }
    
    // Default to medium if unknown
    this.performanceTier = 'medium';
  }
  
  /**
   * Check if WebGL is available
   */
  isAvailable() {
    return this.webglSupported || this.webgl2Supported;
  }
  
  /**
   * Check if WebGL 2 is available
   */
  isWebGL2Available() {
    return this.webgl2Supported;
  }
  
  /**
   * Check if WebGPU is available
   */
  isWebGPUAvailable() {
    return this.webgpuSupported;
  }
  
  /**
   * Get recommended quality settings
   */
  getRecommendedQuality() {
    switch (this.performanceTier) {
      case 'high':
        return {
          pixelRatio: Math.min(window.devicePixelRatio, 2),
          shadowMapSize: 2048,
          antialias: true,
          bloom: true,
          particles: 10000,
          postProcessing: true
        };
      case 'medium':
        return {
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          shadowMapSize: 1024,
          antialias: true,
          bloom: true,
          particles: 5000,
          postProcessing: true
        };
      case 'low':
        return {
          pixelRatio: 1,
          shadowMapSize: 512,
          antialias: false,
          bloom: false,
          particles: 2000,
          postProcessing: false
        };
      default:
        return {
          pixelRatio: 1,
          shadowMapSize: 1024,
          antialias: true,
          bloom: true,
          particles: 5000,
          postProcessing: true
        };
    }
  }
  
  /**
   * Get GPU information summary
   */
  getInfo() {
    return {
      webgl: this.webglSupported,
      webgl2: this.webgl2Supported,
      webgpu: this.webgpuSupported,
      vendor: this.vendor,
      renderer: this.renderer,
      tier: this.performanceTier
    };
  }
  
  /**
   * Get warning message if WebGL not supported
   */
  getWarningMessage() {
    if (!this.webglSupported) {
      return `
        Your browser or graphics card does not support WebGL.
        Please try:
        - Updating your browser to the latest version
        - Updating your graphics drivers
        - Using a different browser (Chrome, Firefox, Safari, Edge)
        - Enabling hardware acceleration in your browser settings
      `;
    }
    return null;
  }
  
  /**
   * Show fallback UI
   */
  showFallback(container) {
    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: #e0e0e0;
        background: #0a0a0f;
      ">
        <h1 style="
          font-size: 2rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #00f5ff, #ff00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        ">WebGL Not Available</h1>
        <p style="max-width: 500px; line-height: 1.6; color: #a0a0a0;">
          ${this.getWarningMessage()}
        </p>
        <a href="fallback/index.html" style="
          margin-top: 2rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #00f5ff, #ff00ff);
          color: #0a0a0f;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
        ">View 2D Version</a>
      </div>
    `;
  }
}

// Create singleton instance
export const webGLDetector = new WebGLDetector();
