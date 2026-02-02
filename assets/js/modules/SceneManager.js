/**
 * SceneManager.js
 * Manages Three.js scene, renderer, lighting, and post-processing
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class SceneManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      antialias: true,
      alpha: false,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      bloomEnabled: true,
      particleCount: 10000,
      ...options
    };
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.clock = new THREE.Clock();
    this.animationId = null;
    this.isRunning = false;
    this.updateCallbacks = [];
    
    // Scene objects
    this.starField = null;
    this.lights = {};
    
    this.init();
  }
  
  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLighting();
    this.createStarField();
    this.createPostProcessing();
    this.setupResize();
  }
  
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    
    // Add fog for depth perception
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.008);
  }
  
  createCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(0, 0, 0);
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(this.options.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  createLighting() {
    // Ambient light - low intensity for cyberpunk feel
    this.lights.ambient = new THREE.AmbientLight(0x1a1a2e, 0.2);
    this.scene.add(this.lights.ambient);
    
    // Cyan point light
    this.lights.cyan = new THREE.PointLight(0x00f5ff, 2, 100);
    this.lights.cyan.position.set(20, 10, 20);
    this.scene.add(this.lights.cyan);
    
    // Magenta point light
    this.lights.magenta = new THREE.PointLight(0xff00ff, 2, 100);
    this.lights.magenta.position.set(-20, -10, 20);
    this.scene.add(this.lights.magenta);
    
    // Purple point light
    this.lights.purple = new THREE.PointLight(0x8b5cf6, 1.5, 80);
    this.lights.purple.position.set(0, 20, -20);
    this.scene.add(this.lights.purple);
    
    // Spotlight for active nodes
    this.lights.spot = new THREE.SpotLight(0xffffff, 0);
    this.lights.spot.angle = Math.PI / 6;
    this.lights.spot.penumbra = 0.5;
    this.lights.spot.decay = 2;
    this.lights.spot.distance = 100;
    this.scene.add(this.lights.spot);
    this.scene.add(this.lights.spot.target);
  }
  
  createStarField() {
    const particleCount = this.options.particleCount;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const colorOptions = [
      new THREE.Color(0xffffff),  // White
      new THREE.Color(0x00f5ff),  // Cyan
      new THREE.Color(0xff00ff),  // Magenta
      new THREE.Color(0x8b5cf6),  // Purple
    ];
    
    for (let i = 0; i < particleCount; i++) {
      // Random spherical distribution
      const radius = 150 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random color from options (mostly white)
      const color = Math.random() > 0.9 
        ? colorOptions[Math.floor(Math.random() * colorOptions.length)]
        : colorOptions[0];
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Random size
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Custom shader material for stars with twinkling
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: this.options.pixelRatio }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        uniform float time;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          vSize = size;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Twinkle effect
          float twinkle = sin(time * 2.0 + position.x * 0.1 + position.y * 0.1) * 0.3 + 0.7;
          
          gl_PointSize = size * pixelRatio * twinkle * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          // Circular point with soft edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          
          // Add glow effect
          vec3 glow = vColor * (1.0 + alpha * 0.5);
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }
  
  createPostProcessing() {
    if (!this.options.bloomEnabled) return;
    
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom pass for neon glow effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      1.5,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;
    
    // Output pass for color space correction
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }
  
  setupResize() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resize(width, height);
      }
    });
    
    this.resizeObserver.observe(this.container);
  }
  
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }
  
  /**
   * Register a callback to be called on each animation frame
   * @param {Function} callback - Function receiving delta time
   */
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }
  
  /**
   * Remove an update callback
   * @param {Function} callback
   */
  offUpdate(callback) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }
  
  /**
   * Animation loop
   */
  animate() {
    if (!this.isRunning) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    
    // Update star field shader
    if (this.starField) {
      this.starField.material.uniforms.time.value = elapsed;
      this.starField.rotation.y += delta * 0.01;
    }
    
    // Animate lights subtly
    if (this.lights.cyan) {
      this.lights.cyan.position.x = 20 + Math.sin(elapsed * 0.5) * 5;
      this.lights.cyan.position.y = 10 + Math.cos(elapsed * 0.3) * 5;
    }
    
    if (this.lights.magenta) {
      this.lights.magenta.position.x = -20 + Math.cos(elapsed * 0.4) * 5;
      this.lights.magenta.position.y = -10 + Math.sin(elapsed * 0.6) * 5;
    }
    
    // Call registered update callbacks
    for (const callback of this.updateCallbacks) {
      callback(delta, elapsed);
    }
    
    // Render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  /**
   * Start the animation loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }
  
  /**
   * Stop the animation loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Add an object to the scene
   * @param {THREE.Object3D} object
   */
  add(object) {
    this.scene.add(object);
  }
  
  /**
   * Remove an object from the scene
   * @param {THREE.Object3D} object
   */
  remove(object) {
    this.scene.remove(object);
  }
  
  /**
   * Highlight a position with spotlight
   * @param {THREE.Vector3} position
   * @param {number} intensity
   */
  highlightPosition(position, intensity = 2) {
    if (this.lights.spot) {
      this.lights.spot.position.set(position.x, position.y + 20, position.z + 20);
      this.lights.spot.target.position.copy(position);
      this.lights.spot.intensity = intensity;
    }
  }
  
  /**
   * Clear spotlight highlight
   */
  clearHighlight() {
    if (this.lights.spot) {
      this.lights.spot.intensity = 0;
    }
  }
  
  /**
   * Set quality level for performance optimization
   * @param {'low' | 'medium' | 'high'} level
   */
  setQualityLevel(level) {
    switch (level) {
      case 'low':
        this.renderer.setPixelRatio(1);
        if (this.bloomPass) {
          this.bloomPass.strength = 0.8;
          this.bloomPass.radius = 0.2;
        }
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        if (this.bloomPass) {
          this.bloomPass.strength = 1.2;
          this.bloomPass.radius = 0.3;
        }
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (this.bloomPass) {
          this.bloomPass.strength = 1.5;
          this.bloomPass.radius = 0.4;
        }
        break;
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Dispose star field
    if (this.starField) {
      this.starField.geometry.dispose();
      this.starField.material.dispose();
    }
    
    // Dispose renderer
    this.renderer.dispose();
    
    // Remove canvas
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    // Clear scene
    this.scene.clear();
  }
}
