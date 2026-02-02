/**
 * InteractionManager.js
 * Handles raycasting, hover effects, and object selection
 */

import * as THREE from 'three';

export class InteractionManager {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    
    this.options = {
      hoverDebounce: 16, // ms
      ...options
    };
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.normalizedMouse = new THREE.Vector2();
    
    // Selectable objects
    this.selectables = [];
    
    // State
    this.hoveredObject = null;
    this.selectedObject = null;
    this.isEnabled = true;
    
    // Callbacks
    this.callbacks = {
      hover: [],
      unhover: [],
      click: [],
      select: []
    };
    
    // Debounce timer
    this.hoverDebounceTimer = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('click', this.onClick.bind(this));
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  /**
   * Register selectable objects
   */
  setSelectables(objects) {
    this.selectables = objects;
  }
  
  /**
   * Add selectable objects
   */
  addSelectables(objects) {
    this.selectables.push(...objects);
  }
  
  /**
   * Remove selectable objects
   */
  removeSelectables(objects) {
    this.selectables = this.selectables.filter(obj => !objects.includes(obj));
  }
  
  /**
   * Update mouse coordinates from event
   */
  updateMouse(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
    
    // Normalized coordinates (-1 to 1)
    this.normalizedMouse.x = (this.mouse.x / rect.width) * 2 - 1;
    this.normalizedMouse.y = -(this.mouse.y / rect.height) * 2 + 1;
  }
  
  /**
   * Perform raycast and return intersections
   */
  raycast() {
    this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
    return this.raycaster.intersectObjects(this.selectables, true);
  }
  
  onPointerMove(event) {
    if (!this.isEnabled) return;
    
    this.updateMouse(event);
    
    // Debounce hover detection
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
    }
    
    this.hoverDebounceTimer = setTimeout(() => {
      this.checkHover();
    }, this.options.hoverDebounce);
  }
  
  checkHover() {
    const intersections = this.raycast();
    
    if (intersections.length > 0) {
      const firstHit = intersections[0].object;
      
      // Find the parent node group
      let nodeGroup = this.findNodeGroup(firstHit);
      
      if (nodeGroup !== this.hoveredObject) {
        // Unhover previous
        if (this.hoveredObject) {
          this.triggerCallbacks('unhover', this.hoveredObject);
        }
        
        // Hover new
        this.hoveredObject = nodeGroup;
        this.domElement.style.cursor = 'pointer';
        this.triggerCallbacks('hover', nodeGroup, intersections[0]);
      }
    } else {
      // No intersection
      if (this.hoveredObject) {
        this.triggerCallbacks('unhover', this.hoveredObject);
        this.hoveredObject = null;
        this.domElement.style.cursor = 'grab';
      }
    }
  }
  
  onClick(event) {
    if (!this.isEnabled) return;
    
    this.updateMouse(event);
    const intersections = this.raycast();
    
    if (intersections.length > 0) {
      const firstHit = intersections[0].object;
      let nodeGroup = this.findNodeGroup(firstHit);
      
      if (nodeGroup) {
        this.selectedObject = nodeGroup;
        this.triggerCallbacks('click', nodeGroup, intersections[0]);
        this.triggerCallbacks('select', nodeGroup, intersections[0]);
      }
    }
  }
  
  onTouchEnd(event) {
    if (!this.isEnabled) return;
    
    // Use last touch position for mobile tap selection
    if (event.changedTouches && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      const rect = this.domElement.getBoundingClientRect();
      
      this.normalizedMouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.normalizedMouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      
      const intersections = this.raycast();
      
      if (intersections.length > 0) {
        const firstHit = intersections[0].object;
        let nodeGroup = this.findNodeGroup(firstHit);
        
        if (nodeGroup) {
          this.selectedObject = nodeGroup;
          this.triggerCallbacks('click', nodeGroup, intersections[0]);
          this.triggerCallbacks('select', nodeGroup, intersections[0]);
        }
      }
    }
  }
  
  /**
   * Find the parent node group from a child mesh
   */
  findNodeGroup(object) {
    let current = object;
    while (current) {
      if (current.userData && current.userData.isNode) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }
  
  /**
   * Register callback for events
   * @param {'hover' | 'unhover' | 'click' | 'select'} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }
  
  /**
   * Remove callback
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }
  
  /**
   * Trigger callbacks for an event
   */
  triggerCallbacks(event, ...args) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(...args));
    }
  }
  
  /**
   * Get current hovered object
   */
  getHovered() {
    return this.hoveredObject;
  }
  
  /**
   * Get current selected object
   */
  getSelected() {
    return this.selectedObject;
  }
  
  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedObject = null;
  }
  
  /**
   * Enable/disable interaction
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      if (this.hoveredObject) {
        this.triggerCallbacks('unhover', this.hoveredObject);
        this.hoveredObject = null;
      }
      this.domElement.style.cursor = 'default';
    }
  }
  
  /**
   * Get intersection point in world coordinates
   */
  getIntersectionPoint(intersection) {
    if (intersection && intersection.point) {
      return intersection.point.clone();
    }
    return null;
  }
  
  /**
   * Check if a specific object is hovered
   */
  isHovered(object) {
    return this.hoveredObject === object;
  }
  
  /**
   * Check if a specific object is selected
   */
  isSelected(object) {
    return this.selectedObject === object;
  }
  
  /**
   * Clean up
   */
  dispose() {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('click', this.onClick);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
    }
    
    this.callbacks = {
      hover: [],
      unhover: [],
      click: [],
      select: []
    };
    
    this.selectables = [];
  }
}
