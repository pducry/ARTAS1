/**
 * AccessibilityManager.js
 * Handles accessibility features including keyboard navigation, ARIA, and reduced motion
 */

export class AccessibilityManager {
  constructor(options = {}) {
    this.options = {
      onNodeFocus: null,
      onNodeActivate: null,
      nodeCount: 5,
      ...options
    };
    
    this.currentFocusIndex = 0;
    this.isKeyboardNavActive = false;
    this.reducedMotion = false;
    
    this.init();
  }
  
  init() {
    this.checkReducedMotion();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
  }
  
  /**
   * Check if user prefers reduced motion
   */
  checkReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    
    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      this.announceChange(
        this.reducedMotion 
          ? 'Reduced motion preference detected' 
          : 'Normal motion preference detected'
      );
    });
    
    return this.reducedMotion;
  }
  
  /**
   * Set up global keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key) {
        case 'Tab':
          // Tab through nodes when in 3D space
          if (!e.target.closest('.content-panel') && !e.target.closest('.nav-list')) {
            e.preventDefault();
            if (e.shiftKey) {
              this.focusPrevNode();
            } else {
              this.focusNextNode();
            }
          }
          break;
          
        case 'Enter':
        case ' ':
          // Activate focused node
          if (this.isKeyboardNavActive) {
            e.preventDefault();
            this.activateCurrentNode();
          }
          break;
          
        case 'Escape':
          // Clear focus
          this.clearFocus();
          break;
          
        case 'Home':
          // Go to first node
          e.preventDefault();
          this.focusNode(0);
          break;
          
        case 'End':
          // Go to last node
          e.preventDefault();
          this.focusNode(this.options.nodeCount - 1);
          break;
          
        case '?':
          // Show help
          this.announceHelp();
          break;
      }
    });
  }
  
  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Detect keyboard vs mouse navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });
  }
  
  /**
   * Focus next node
   */
  focusNextNode() {
    this.focusNode((this.currentFocusIndex + 1) % this.options.nodeCount);
  }
  
  /**
   * Focus previous node
   */
  focusPrevNode() {
    this.focusNode(
      (this.currentFocusIndex - 1 + this.options.nodeCount) % this.options.nodeCount
    );
  }
  
  /**
   * Focus specific node
   */
  focusNode(index) {
    this.currentFocusIndex = index;
    this.isKeyboardNavActive = true;
    
    if (this.options.onNodeFocus) {
      this.options.onNodeFocus(index);
    }
  }
  
  /**
   * Activate current focused node
   */
  activateCurrentNode() {
    if (this.options.onNodeActivate) {
      this.options.onNodeActivate(this.currentFocusIndex);
    }
  }
  
  /**
   * Clear keyboard focus
   */
  clearFocus() {
    this.isKeyboardNavActive = false;
  }
  
  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    const liveRegion = document.getElementById('aria-live');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
    }
  }
  
  /**
   * Announce a change
   */
  announceChange(message) {
    this.announce(message, 'assertive');
  }
  
  /**
   * Announce navigation help
   */
  announceHelp() {
    this.announce(
      'Keyboard shortcuts: Tab to navigate between nodes, Enter to select, ' +
      'Arrow keys to rotate view, Plus and Minus to zoom, ' +
      'Number keys 1 through 5 for direct navigation, Escape to close panels.'
    );
  }
  
  /**
   * Announce current position
   */
  announcePosition(nodeName, index, total) {
    this.announce(`${nodeName}, node ${index + 1} of ${total}`);
  }
  
  /**
   * Check if reduced motion is preferred
   */
  prefersReducedMotion() {
    return this.reducedMotion;
  }
  
  /**
   * Set reduced motion manually
   */
  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
  }
  
  /**
   * Get current focus index
   */
  getFocusIndex() {
    return this.currentFocusIndex;
  }
  
  /**
   * Check if keyboard navigation is active
   */
  isKeyboardNavigating() {
    return this.isKeyboardNavActive;
  }
  
  /**
   * Create skip link
   */
  createSkipLink(targetId, text = 'Skip to main content') {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.className = 'skip-link';
    skipLink.textContent = text;
    document.body.insertBefore(skipLink, document.body.firstChild);
    return skipLink;
  }
  
  /**
   * Update ARIA attributes on an element
   */
  updateAriaAttributes(element, attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(`aria-${key}`, value);
    }
  }
  
  /**
   * Create accessible button
   */
  createAccessibleButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.setAttribute('type', 'button');
    button.addEventListener('click', onClick);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    });
    return button;
  }
  
  /**
   * Trap focus within an element (for modals)
   */
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    };
    
    element.addEventListener('keydown', handleTab);
    
    // Return cleanup function
    return () => element.removeEventListener('keydown', handleTab);
  }
  
  /**
   * Clean up
   */
  dispose() {
    // Clean up would remove event listeners
  }
}
