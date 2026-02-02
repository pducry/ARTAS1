/**
 * CameraController.js
 * Handles orbital camera navigation with GSAP-powered smooth transitions
 */

import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    
    this.options = {
      enableDamping: true,
      dampingFactor: 0.05,
      rotateSpeed: 0.5,
      zoomSpeed: 1.0,
      minDistance: 20,
      maxDistance: 100,
      minPolarAngle: Math.PI * 0.1,
      maxPolarAngle: Math.PI * 0.9,
      transitionDuration: 2,
      reducedMotion: false,
      ...options
    };
    
    // Spherical coordinates for orbit
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.target = new THREE.Vector3(0, 0, 0);
    this.targetOffset = new THREE.Vector3();
    
    // State
    this.enabled = true;
    this.isTransitioning = false;
    this.currentNodeIndex = 0;
    
    // Node positions for navigation
    this.nodePositions = [
      { position: new THREE.Vector3(0, 0, 50), target: new THREE.Vector3(0, 0, 0), name: 'Hub' },
      { position: new THREE.Vector3(30, 5, 25), target: new THREE.Vector3(25, 0, 10), name: 'About' },
      { position: new THREE.Vector3(-30, 10, 20), target: new THREE.Vector3(-25, 5, 5), name: 'Work' },
      { position: new THREE.Vector3(15, -10, 35), target: new THREE.Vector3(10, -5, 20), name: 'Services' },
      { position: new THREE.Vector3(-20, 0, 30), target: new THREE.Vector3(-15, 0, 15), name: 'Contact' }
    ];
    
    // Input state
    this.pointerState = {
      isDown: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
    
    this.touchState = {
      initialDistance: 0,
      currentDistance: 0
    };
    
    // Callbacks
    this.onNavigateCallbacks = [];
    
    // GSAP reference (will be set when GSAP is loaded)
    this.gsap = null;
    
    this.init();
  }
  
  async init() {
    // Dynamically import GSAP
    try {
      const gsapModule = await import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js');
      this.gsap = gsapModule.gsap;
    } catch (e) {
      console.warn('GSAP not available, using fallback animations');
    }
    
    // Initialize spherical from camera position
    this.updateSphericalFromCamera();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  updateSphericalFromCamera() {
    const offset = new THREE.Vector3();
    offset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(offset);
  }
  
  setupEventListeners() {
    // Pointer events (unified mouse/touch)
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.addEventListener('pointercancel', this.onPointerUp.bind(this));
    
    // Wheel for zoom
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    // Touch events for pinch zoom
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    
    // Keyboard navigation
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    
    // Prevent context menu
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  onPointerDown(event) {
    if (!this.enabled || this.isTransitioning) return;
    if (event.button !== 0) return; // Left click only
    
    this.pointerState.isDown = true;
    this.pointerState.startX = event.clientX;
    this.pointerState.startY = event.clientY;
    this.pointerState.currentX = event.clientX;
    this.pointerState.currentY = event.clientY;
    
    this.domElement.style.cursor = 'grabbing';
    this.domElement.setPointerCapture(event.pointerId);
  }
  
  onPointerMove(event) {
    if (!this.enabled || !this.pointerState.isDown) return;
    
    const deltaX = event.clientX - this.pointerState.currentX;
    const deltaY = event.clientY - this.pointerState.currentY;
    
    this.pointerState.currentX = event.clientX;
    this.pointerState.currentY = event.clientY;
    
    // Rotate camera
    this.sphericalDelta.theta -= deltaX * this.options.rotateSpeed * 0.01;
    this.sphericalDelta.phi -= deltaY * this.options.rotateSpeed * 0.01;
  }
  
  onPointerUp(event) {
    this.pointerState.isDown = false;
    this.domElement.style.cursor = 'grab';
    this.domElement.releasePointerCapture(event.pointerId);
  }
  
  onWheel(event) {
    if (!this.enabled || this.isTransitioning) return;
    event.preventDefault();
    
    const zoomDelta = event.deltaY * 0.001 * this.options.zoomSpeed;
    this.spherical.radius *= (1 + zoomDelta);
    
    // Clamp zoom
    this.spherical.radius = Math.max(
      this.options.minDistance,
      Math.min(this.options.maxDistance, this.spherical.radius)
    );
  }
  
  onTouchStart(event) {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }
  
  onTouchMove(event) {
    if (!this.enabled || this.isTransitioning) return;
    
    if (event.touches.length === 2) {
      event.preventDefault();
      
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.touchState.currentDistance = Math.sqrt(dx * dx + dy * dy);
      
      const ratio = this.touchState.initialDistance / this.touchState.currentDistance;
      this.spherical.radius *= ratio;
      
      // Clamp zoom
      this.spherical.radius = Math.max(
        this.options.minDistance,
        Math.min(this.options.maxDistance, this.spherical.radius)
      );
      
      this.touchState.initialDistance = this.touchState.currentDistance;
    }
  }
  
  onKeyDown(event) {
    if (!this.enabled) return;
    
    // Number keys 1-5 for direct node navigation
    if (event.key >= '1' && event.key <= '5') {
      const nodeIndex = parseInt(event.key) - 1;
      if (nodeIndex < this.nodePositions.length) {
        this.navigateToNode(nodeIndex);
      }
      return;
    }
    
    // Arrow keys for rotation
    const rotateAmount = this.options.rotateSpeed * 0.1;
    const zoomAmount = 2;
    
    switch (event.key) {
      case 'ArrowLeft':
        this.sphericalDelta.theta += rotateAmount;
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.sphericalDelta.theta -= rotateAmount;
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.sphericalDelta.phi -= rotateAmount;
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.sphericalDelta.phi += rotateAmount;
        event.preventDefault();
        break;
      case '+':
      case '=':
        this.spherical.radius -= zoomAmount;
        this.spherical.radius = Math.max(this.options.minDistance, this.spherical.radius);
        event.preventDefault();
        break;
      case '-':
      case '_':
        this.spherical.radius += zoomAmount;
        this.spherical.radius = Math.min(this.options.maxDistance, this.spherical.radius);
        event.preventDefault();
        break;
      case 'Home':
        this.navigateToNode(0);
        event.preventDefault();
        break;
      case 'Tab':
        // Cycle through nodes
        const nextIndex = event.shiftKey
          ? (this.currentNodeIndex - 1 + this.nodePositions.length) % this.nodePositions.length
          : (this.currentNodeIndex + 1) % this.nodePositions.length;
        this.navigateToNode(nextIndex);
        event.preventDefault();
        break;
    }
  }
  
  /**
   * Navigate to a specific node with smooth transition
   * @param {number} nodeIndex
   */
  async navigateToNode(nodeIndex) {
    if (nodeIndex < 0 || nodeIndex >= this.nodePositions.length) return;
    if (this.isTransitioning) return;
    
    const node = this.nodePositions[nodeIndex];
    this.currentNodeIndex = nodeIndex;
    this.isTransitioning = true;
    
    const duration = this.options.reducedMotion ? 0.1 : this.options.transitionDuration;
    
    // Notify listeners
    this.onNavigateCallbacks.forEach(cb => cb(nodeIndex, node.name));
    
    if (this.gsap) {
      // GSAP animation
      await Promise.all([
        this.gsap.to(this.camera.position, {
          x: node.position.x,
          y: node.position.y,
          z: node.position.z,
          duration,
          ease: 'power2.inOut'
        }),
        this.gsap.to(this.target, {
          x: node.target.x,
          y: node.target.y,
          z: node.target.z,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            this.camera.lookAt(this.target);
          }
        })
      ]);
    } else {
      // Fallback linear interpolation
      await this.fallbackTransition(node, duration);
    }
    
    // Update spherical coordinates
    this.updateSphericalFromCamera();
    this.isTransitioning = false;
  }
  
  /**
   * Fallback animation when GSAP is not available
   */
  fallbackTransition(node, duration) {
    return new Promise((resolve) => {
      const startPos = this.camera.position.clone();
      const startTarget = this.target.clone();
      const startTime = performance.now();
      const durationMs = duration * 1000;
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        
        // Ease in-out
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        this.camera.position.lerpVectors(startPos, node.position, eased);
        this.target.lerpVectors(startTarget, node.target, eased);
        this.camera.lookAt(this.target);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }
  
  /**
   * Get the current node's target position (for interaction)
   */
  getCurrentTarget() {
    return this.nodePositions[this.currentNodeIndex].target.clone();
  }
  
  /**
   * Get all node positions
   */
  getNodePositions() {
    return this.nodePositions;
  }
  
  /**
   * Register callback for navigation events
   */
  onNavigate(callback) {
    this.onNavigateCallbacks.push(callback);
  }
  
  /**
   * Remove navigation callback
   */
  offNavigate(callback) {
    const index = this.onNavigateCallbacks.indexOf(callback);
    if (index > -1) {
      this.onNavigateCallbacks.splice(index, 1);
    }
  }
  
  /**
   * Set reduced motion mode
   */
  setReducedMotion(enabled) {
    this.options.reducedMotion = enabled;
  }
  
  /**
   * Update camera each frame
   */
  update(delta) {
    if (!this.enabled || this.isTransitioning) return;
    
    // Apply rotation delta with damping
    if (this.options.enableDamping) {
      this.spherical.theta += this.sphericalDelta.theta * this.options.dampingFactor;
      this.spherical.phi += this.sphericalDelta.phi * this.options.dampingFactor;
      
      // Decay delta
      this.sphericalDelta.theta *= (1 - this.options.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.options.dampingFactor);
    } else {
      this.spherical.theta += this.sphericalDelta.theta;
      this.spherical.phi += this.sphericalDelta.phi;
      this.sphericalDelta.set(0, 0, 0);
    }
    
    // Clamp polar angle
    this.spherical.phi = Math.max(
      this.options.minPolarAngle,
      Math.min(this.options.maxPolarAngle, this.spherical.phi)
    );
    
    // Update camera position from spherical coordinates
    const offset = new THREE.Vector3();
    offset.setFromSpherical(this.spherical);
    
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
  
  /**
   * Navigate to a 3D position (for clicking on objects)
   */
  async navigateToPosition(position, lookAt) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    const duration = this.options.reducedMotion ? 0.1 : this.options.transitionDuration;
    
    // Calculate a good viewing position
    const direction = new THREE.Vector3().subVectors(position, lookAt || position).normalize();
    const viewPosition = position.clone().add(direction.multiplyScalar(30));
    
    if (this.gsap) {
      await Promise.all([
        this.gsap.to(this.camera.position, {
          x: viewPosition.x,
          y: viewPosition.y,
          z: viewPosition.z,
          duration,
          ease: 'power2.inOut'
        }),
        this.gsap.to(this.target, {
          x: position.x,
          y: position.y,
          z: position.z,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            this.camera.lookAt(this.target);
          }
        })
      ]);
    }
    
    this.updateSphericalFromCamera();
    this.isTransitioning = false;
  }
  
  /**
   * Reset camera to initial position
   */
  reset() {
    this.navigateToNode(0);
  }
  
  /**
   * Clean up
   */
  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('keydown', this.onKeyDown);
    
    this.onNavigateCallbacks = [];
  }
}
