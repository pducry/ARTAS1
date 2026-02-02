/**
 * main.js
 * Application entry point - orchestrates all modules
 */

import { SceneManager } from './modules/SceneManager.js';
import { CameraController } from './modules/CameraController.js';
import { ContentNodes, NODE_DATA } from './modules/ContentNodes.js';
import { InteractionManager } from './modules/InteractionManager.js';
import { UIController } from './modules/UIController.js';
import { simulateLoading } from './modules/ContentLoader.js';
import { webGLDetector } from './utils/WebGLDetector.js';
import { AccessibilityManager } from './utils/AccessibilityManager.js';

/**
 * Main Application Class
 */
class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.isInitialized = false;
    this.isReady = false;
    
    // Module instances
    this.sceneManager = null;
    this.cameraController = null;
    this.contentNodes = null;
    this.interactionManager = null;
    this.uiController = null;
    this.accessibilityManager = null;
    
    // Quality settings
    this.qualitySettings = null;
    
    this.init();
  }
  
  async init() {
    console.log('Initializing 3D Spatial Navigation Platform...');
    
    // Check WebGL support
    if (!webGLDetector.isAvailable()) {
      console.warn('WebGL not available, showing fallback');
      webGLDetector.showFallback(this.container);
      this.hideLoadingScreen();
      return;
    }
    
    // Get GPU info and recommended settings
    const gpuInfo = webGLDetector.getInfo();
    console.log('GPU Info:', gpuInfo);
    
    this.qualitySettings = webGLDetector.getRecommendedQuality();
    console.log('Quality Settings:', this.qualitySettings);
    
    // Initialize UI Controller first (for loading screen)
    this.uiController = new UIController({
      onNavigate: (index) => this.navigateToNode(index),
      onPanelClose: () => this.onPanelClose()
    });
    
    // Show loading and initialize 3D
    try {
      await this.initializeWithLoading();
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.handleError(error);
    }
  }
  
  async initializeWithLoading() {
    // Simulate loading with progress updates
    await simulateLoading(
      (progress) => this.uiController.updateLoadingProgress(progress),
      2000
    );
    
    // Initialize 3D components
    await this.initialize3D();
    
    // Hide loading screen
    this.uiController.hideLoading();
    
    // Mark as ready
    this.isReady = true;
    
    console.log('Platform initialized successfully');
  }
  
  async initialize3D() {
    // Scene Manager
    this.sceneManager = new SceneManager(this.container, {
      antialias: this.qualitySettings.antialias,
      pixelRatio: this.qualitySettings.pixelRatio,
      bloomEnabled: this.qualitySettings.bloom,
      particleCount: this.qualitySettings.particles
    });
    
    // Content Nodes
    this.contentNodes = new ContentNodes(this.sceneManager.scene, {
      enableParticles: this.qualitySettings.particles > 2000,
      enableGlow: this.qualitySettings.postProcessing
    });
    
    // Camera Controller
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement,
      {
        reducedMotion: this.uiController.isReducedMotion()
      }
    );
    
    // Set up camera navigation callback
    this.cameraController.onNavigate((index, name) => {
      this.uiController.setActiveNode(index);
      this.accessibilityManager?.announcePosition(name, index, NODE_DATA.length);
    });
    
    // Interaction Manager
    this.interactionManager = new InteractionManager(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement
    );
    
    // Register selectable objects
    this.interactionManager.setSelectables(this.contentNodes.getSelectableMeshes());
    
    // Set up interaction callbacks
    this.setupInteractionCallbacks();
    
    // Accessibility Manager
    this.accessibilityManager = new AccessibilityManager({
      nodeCount: NODE_DATA.length,
      onNodeFocus: (index) => this.focusNode(index),
      onNodeActivate: (index) => this.activateNode(index)
    });
    
    // Check reduced motion preference
    if (this.accessibilityManager.prefersReducedMotion()) {
      this.cameraController.setReducedMotion(true);
      this.uiController.setReducedMotion(true);
    }
    
    // Set up update loop
    this.sceneManager.onUpdate((delta, elapsed) => {
      this.update(delta, elapsed);
    });
    
    // Start rendering
    this.sceneManager.start();
    
    this.isInitialized = true;
  }
  
  setupInteractionCallbacks() {
    // Hover
    this.interactionManager.on('hover', (nodeGroup, intersection) => {
      this.contentNodes.setHovered(nodeGroup);
      
      // Show tooltip
      if (nodeGroup?.userData) {
        const screenPos = this.getScreenPosition(intersection.point);
        this.uiController.showTooltip(nodeGroup.userData.name, screenPos.x, screenPos.y);
      }
      
      // Highlight in scene
      this.sceneManager.highlightPosition(nodeGroup.position, 1);
    });
    
    // Unhover
    this.interactionManager.on('unhover', (nodeGroup) => {
      this.contentNodes.setHovered(null);
      this.uiController.hideTooltip();
      this.sceneManager.clearHighlight();
    });
    
    // Click/Select
    this.interactionManager.on('select', (nodeGroup, intersection) => {
      if (nodeGroup?.userData) {
        const nodeIndex = nodeGroup.userData.index;
        this.navigateToNode(nodeIndex);
        
        // Open content panel after navigation
        setTimeout(() => {
          const nodeData = NODE_DATA[nodeIndex];
          this.uiController.openPanel(nodeData);
        }, 500);
      }
    });
  }
  
  /**
   * Navigate to a specific node
   */
  navigateToNode(index) {
    if (!this.isInitialized) return;
    
    this.cameraController.navigateToNode(index);
    this.contentNodes.setSelected(this.contentNodes.getNode(index)?.group);
  }
  
  /**
   * Focus a node (keyboard navigation)
   */
  focusNode(index) {
    if (!this.isInitialized) return;
    
    // Navigate camera to node
    this.cameraController.navigateToNode(index);
    
    // Update UI
    this.uiController.setActiveNode(index);
    
    // Highlight node
    const node = this.contentNodes.getNode(index);
    if (node) {
      this.contentNodes.setHovered(node.group);
      this.sceneManager.highlightPosition(node.data.position, 2);
    }
  }
  
  /**
   * Activate a node (keyboard selection)
   */
  activateNode(index) {
    if (!this.isInitialized) return;
    
    // Navigate and open panel
    this.navigateToNode(index);
    
    setTimeout(() => {
      const nodeData = NODE_DATA[index];
      this.uiController.openPanel(nodeData);
    }, 500);
  }
  
  /**
   * Handle panel close
   */
  onPanelClose() {
    // Clear selection highlight
    this.contentNodes.setHovered(null);
    this.sceneManager.clearHighlight();
  }
  
  /**
   * Update loop - called every frame
   */
  update(delta, elapsed) {
    // Update camera
    this.cameraController?.update(delta);
    
    // Update content nodes
    this.contentNodes?.update(delta, elapsed);
  }
  
  /**
   * Get screen position from 3D point
   */
  getScreenPosition(point) {
    const vector = point.clone();
    vector.project(this.sceneManager.camera);
    
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    };
  }
  
  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.setAttribute('hidden', '');
    }
  }
  
  /**
   * Handle initialization errors
   */
  handleError(error) {
    console.error('Application error:', error);
    
    this.hideLoadingScreen();
    
    this.container.innerHTML = `
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
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #ff6b6b;
        ">Something went wrong</h1>
        <p style="max-width: 500px; line-height: 1.6; color: #a0a0a0; margin-bottom: 1rem;">
          We couldn't initialize the 3D experience. This might be due to browser 
          compatibility or hardware limitations.
        </p>
        <p style="color: #666; font-size: 0.875rem; margin-bottom: 2rem;">
          Error: ${error.message}
        </p>
        <a href="fallback/index.html" style="
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
  
  /**
   * Set quality level dynamically
   */
  setQualityLevel(level) {
    this.sceneManager?.setQualityLevel(level);
    this.contentNodes?.setQualityLevel(level);
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.sceneManager?.dispose();
    this.cameraController?.dispose();
    this.contentNodes?.dispose();
    this.interactionManager?.dispose();
    this.uiController?.dispose();
    this.accessibilityManager?.dispose();
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
  const app = window.__app;
  if (!app?.sceneManager) return;
  
  if (document.hidden) {
    app.sceneManager.stop();
  } else {
    app.sceneManager.start();
  }
});

// Store app instance for debugging
window.__app = null;
document.addEventListener('DOMContentLoaded', () => {
  window.__app = new App();
});

// Export for potential external use
export { App };
