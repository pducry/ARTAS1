/**
 * UIController.js
 * Manages 2D UI overlays, navigation menu, content panels, and mini-map
 */

import { NODE_DATA } from './ContentNodes.js';

export class UIController {
  constructor(options = {}) {
    this.options = {
      onNavigate: null,
      onPanelOpen: null,
      onPanelClose: null,
      ...options
    };
    
    // DOM elements
    this.elements = {
      loadingScreen: document.getElementById('loading-screen'),
      loadingBarFill: document.getElementById('loading-bar-fill'),
      loadingPercent: document.getElementById('loading-percent'),
      loadingSkip: document.getElementById('loading-skip'),
      navMenu: document.getElementById('nav-menu'),
      navToggle: document.getElementById('nav-toggle'),
      navList: document.getElementById('nav-list'),
      motionToggle: document.getElementById('motion-toggle'),
      controlsHelp: document.getElementById('controls-help'),
      miniMap: document.getElementById('mini-map'),
      miniMapCanvas: document.getElementById('mini-map-canvas'),
      contentPanel: document.getElementById('content-panel'),
      contentPanelTitle: document.getElementById('content-panel-title'),
      contentPanelBody: document.getElementById('content-panel-body'),
      contentPanelClose: document.getElementById('content-panel-close'),
      tooltip: document.getElementById('tooltip'),
      ariaLive: document.getElementById('aria-live')
    };
    
    // State
    this.currentNodeIndex = 0;
    this.isPanelOpen = false;
    this.isNavOpen = false;
    this.reducedMotion = false;
    
    // Mini-map
    this.miniMapCtx = null;
    
    this.init();
  }
  
  init() {
    this.setupNavigation();
    this.setupContentPanel();
    this.setupMotionToggle();
    this.setupMiniMap();
    this.setupLoadingSkip();
    this.checkReducedMotion();
  }
  
  setupNavigation() {
    // Mobile nav toggle
    if (this.elements.navToggle) {
      this.elements.navToggle.addEventListener('click', () => {
        this.toggleNav();
      });
    }
    
    // Nav items
    const navItems = this.elements.navList?.querySelectorAll('.nav-item');
    navItems?.forEach((item, index) => {
      item.addEventListener('click', () => {
        this.navigateToNode(index);
      });
      
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.navigateToNode(index);
        }
      });
    });
  }
  
  setupContentPanel() {
    // Close button
    if (this.elements.contentPanelClose) {
      this.elements.contentPanelClose.addEventListener('click', () => {
        this.closePanel();
      });
    }
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isPanelOpen) {
        this.closePanel();
      }
    });
    
    // Close when clicking outside
    if (this.elements.contentPanel) {
      this.elements.contentPanel.addEventListener('click', (e) => {
        if (e.target === this.elements.contentPanel) {
          this.closePanel();
        }
      });
    }
  }
  
  setupMotionToggle() {
    if (this.elements.motionToggle) {
      this.elements.motionToggle.addEventListener('click', () => {
        this.toggleReducedMotion();
      });
    }
  }
  
  setupMiniMap() {
    if (this.elements.miniMapCanvas) {
      this.miniMapCtx = this.elements.miniMapCanvas.getContext('2d');
      this.drawMiniMap();
    }
  }
  
  setupLoadingSkip() {
    if (this.elements.loadingSkip) {
      this.elements.loadingSkip.addEventListener('click', () => {
        // Redirect to 2D fallback or skip loading
        this.hideLoading();
      });
    }
  }
  
  checkReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.setReducedMotion(true);
    }
  }
  
  /**
   * Update loading progress
   */
  updateLoadingProgress(percent) {
    if (this.elements.loadingBarFill) {
      this.elements.loadingBarFill.style.width = `${percent}%`;
    }
    if (this.elements.loadingPercent) {
      this.elements.loadingPercent.textContent = `${Math.round(percent)}%`;
    }
  }
  
  /**
   * Hide loading screen
   */
  hideLoading() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.setAttribute('hidden', '');
      
      // Remove from DOM after transition
      setTimeout(() => {
        this.elements.loadingScreen.style.display = 'none';
      }, 500);
    }
    
    this.announce('3D environment loaded. Use mouse to rotate view, scroll to zoom, click on nodes to explore.');
  }
  
  /**
   * Show loading screen
   */
  showLoading() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.style.display = '';
      this.elements.loadingScreen.removeAttribute('hidden');
    }
  }
  
  /**
   * Toggle mobile navigation
   */
  toggleNav() {
    this.isNavOpen = !this.isNavOpen;
    
    if (this.elements.navMenu) {
      this.elements.navMenu.dataset.open = this.isNavOpen;
    }
    if (this.elements.navToggle) {
      this.elements.navToggle.setAttribute('aria-expanded', this.isNavOpen);
    }
  }
  
  /**
   * Navigate to a node via menu
   */
  navigateToNode(index) {
    this.setActiveNode(index);
    
    // Close mobile nav
    if (this.isNavOpen) {
      this.toggleNav();
    }
    
    // Callback
    if (this.options.onNavigate) {
      this.options.onNavigate(index);
    }
    
    // Update mini-map
    this.drawMiniMap();
    
    // Announce for screen readers
    const nodeName = NODE_DATA[index]?.name || `Node ${index + 1}`;
    this.announce(`Navigating to ${nodeName}`);
  }
  
  /**
   * Set active node in navigation
   */
  setActiveNode(index) {
    this.currentNodeIndex = index;
    
    const navItems = this.elements.navList?.querySelectorAll('.nav-item');
    navItems?.forEach((item, i) => {
      item.dataset.active = i === index;
    });
    
    // Update mini-map
    this.drawMiniMap();
  }
  
  /**
   * Open content panel with node data
   */
  openPanel(nodeData) {
    if (!this.elements.contentPanel) return;
    
    this.isPanelOpen = true;
    this.elements.contentPanel.dataset.open = 'true';
    this.elements.contentPanel.setAttribute('aria-hidden', 'false');
    
    // Set content
    if (this.elements.contentPanelTitle) {
      this.elements.contentPanelTitle.textContent = nodeData.title || nodeData.name;
    }
    if (this.elements.contentPanelBody) {
      this.elements.contentPanelBody.innerHTML = `
        <p>${nodeData.description}</p>
        ${this.getAdditionalContent(nodeData.id)}
      `;
    }
    
    // Focus close button
    setTimeout(() => {
      this.elements.contentPanelClose?.focus();
    }, 100);
    
    // Callback
    if (this.options.onPanelOpen) {
      this.options.onPanelOpen(nodeData);
    }
    
    this.announce(`${nodeData.title} panel opened`);
  }
  
  /**
   * Get additional content based on node type
   */
  getAdditionalContent(nodeId) {
    switch (nodeId) {
      case 'contact':
        return `
          <form class="contact-form" style="margin-top: 1.5rem;">
            <div style="margin-bottom: 1rem;">
              <label for="contact-name" style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Name</label>
              <input type="text" id="contact-name" name="name" 
                style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--glass-border); border-radius: var(--radius-md); color: var(--text-primary);">
            </div>
            <div style="margin-bottom: 1rem;">
              <label for="contact-email" style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Email</label>
              <input type="email" id="contact-email" name="email" 
                style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--glass-border); border-radius: var(--radius-md); color: var(--text-primary);">
            </div>
            <div style="margin-bottom: 1rem;">
              <label for="contact-message" style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Message</label>
              <textarea id="contact-message" name="message" rows="4" 
                style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--glass-border); border-radius: var(--radius-md); color: var(--text-primary); resize: vertical;"></textarea>
            </div>
            <button type="submit" 
              style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta)); border: none; border-radius: var(--radius-md); color: var(--bg-primary); font-weight: 600; cursor: pointer;">
              Send Message
            </button>
          </form>
        `;
      case 'work':
        return `
          <div style="margin-top: 1.5rem; display: grid; gap: 1rem;">
            <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
              <h3 style="color: var(--neon-cyan); margin-bottom: 0.5rem;">Project Alpha</h3>
              <p style="color: var(--text-muted); font-size: 0.875rem;">Interactive 3D data visualization platform</p>
            </div>
            <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
              <h3 style="color: var(--neon-magenta); margin-bottom: 0.5rem;">Project Beta</h3>
              <p style="color: var(--text-muted); font-size: 0.875rem;">WebXR virtual showroom experience</p>
            </div>
            <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
              <h3 style="color: var(--neon-purple); margin-bottom: 0.5rem;">Project Gamma</h3>
              <p style="color: var(--text-muted); font-size: 0.875rem;">Real-time collaborative design tool</p>
            </div>
          </div>
        `;
      case 'services':
        return `
          <div style="margin-top: 1.5rem; display: grid; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <span style="color: var(--neon-cyan);">✦</span>
              <span style="color: var(--text-secondary);">3D Web Development</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <span style="color: var(--neon-magenta);">✦</span>
              <span style="color: var(--text-secondary);">Interactive Experiences</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <span style="color: var(--neon-purple);">✦</span>
              <span style="color: var(--text-secondary);">VR/AR Applications</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md);">
              <span style="color: var(--neon-green);">✦</span>
              <span style="color: var(--text-secondary);">Technical Consultation</span>
            </div>
          </div>
        `;
      default:
        return '';
    }
  }
  
  /**
   * Close content panel
   */
  closePanel() {
    if (!this.elements.contentPanel) return;
    
    this.isPanelOpen = false;
    this.elements.contentPanel.dataset.open = 'false';
    this.elements.contentPanel.setAttribute('aria-hidden', 'true');
    
    // Callback
    if (this.options.onPanelClose) {
      this.options.onPanelClose();
    }
    
    this.announce('Panel closed');
  }
  
  /**
   * Toggle reduced motion
   */
  toggleReducedMotion() {
    this.setReducedMotion(!this.reducedMotion);
  }
  
  /**
   * Set reduced motion state
   */
  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
    
    if (this.elements.motionToggle) {
      this.elements.motionToggle.setAttribute('aria-pressed', enabled);
      this.elements.motionToggle.textContent = enabled ? 'Enable Motion' : 'Reduce Motion';
    }
    
    // Apply to document
    document.documentElement.style.setProperty(
      '--transition-base',
      enabled ? '0ms' : '300ms cubic-bezier(0.4, 0, 0.2, 1)'
    );
    
    this.announce(enabled ? 'Reduced motion enabled' : 'Motion enabled');
    
    return enabled;
  }
  
  /**
   * Get reduced motion state
   */
  isReducedMotion() {
    return this.reducedMotion;
  }
  
  /**
   * Show tooltip at position
   */
  showTooltip(text, x, y) {
    if (!this.elements.tooltip) return;
    
    this.elements.tooltip.textContent = text;
    this.elements.tooltip.style.left = `${x + 15}px`;
    this.elements.tooltip.style.top = `${y + 15}px`;
    this.elements.tooltip.dataset.visible = 'true';
  }
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.elements.tooltip) {
      this.elements.tooltip.dataset.visible = 'false';
    }
  }
  
  /**
   * Draw mini-map
   */
  drawMiniMap() {
    if (!this.miniMapCtx) return;
    
    const ctx = this.miniMapCtx;
    const canvas = this.elements.miniMapCanvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Map 3D positions to 2D mini-map
    const scale = 2;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw connections first
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1;
    NODE_DATA.forEach((node, index) => {
      if (index > 0) {
        const hubX = centerX + NODE_DATA[0].position.x * scale;
        const hubY = centerY + NODE_DATA[0].position.z * scale;
        const nodeX = centerX + node.position.x * scale;
        const nodeY = centerY + node.position.z * scale;
        
        ctx.beginPath();
        ctx.moveTo(hubX, hubY);
        ctx.lineTo(nodeX, nodeY);
        ctx.stroke();
      }
    });
    
    // Draw nodes
    NODE_DATA.forEach((node, index) => {
      const x = centerX + node.position.x * scale;
      const y = centerY + node.position.z * scale;
      const isActive = index === this.currentNodeIndex;
      
      // Glow for active node
      if (isActive) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        gradient.addColorStop(0, `#${node.color.toString(16).padStart(6, '0')}40`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Node dot
      ctx.fillStyle = `#${node.color.toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Label
      if (isActive) {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, x, y + 16);
      }
    });
  }
  
  /**
   * Announce message to screen readers
   */
  announce(message) {
    if (this.elements.ariaLive) {
      this.elements.ariaLive.textContent = message;
    }
  }
  
  /**
   * Update controls help visibility
   */
  setControlsHelpVisible(visible) {
    if (this.elements.controlsHelp) {
      this.elements.controlsHelp.style.display = visible ? '' : 'none';
    }
  }
  
  /**
   * Clean up
   */
  dispose() {
    // Remove event listeners would go here
  }
}
