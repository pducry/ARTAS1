/**
 * ContentNodes.js
 * Creates 3D content planets/nodes with glow effects and particle orbits
 */

import * as THREE from 'three';

// Node content data
export const NODE_DATA = [
  {
    id: 'hub',
    name: 'Hub',
    title: 'Welcome',
    description: 'Explore our immersive 3D environment. Navigate through space to discover content and experiences.',
    position: new THREE.Vector3(0, 0, 0),
    color: 0x8b5cf6, // Purple
    size: 4,
    particleCount: 100
  },
  {
    id: 'about',
    name: 'About',
    title: 'About Us',
    description: 'We create cutting-edge digital experiences that push the boundaries of web technology. Our team specializes in immersive 3D web applications, interactive installations, and innovative user interfaces.',
    position: new THREE.Vector3(25, 0, 10),
    color: 0x00f5ff, // Cyan
    size: 3,
    particleCount: 60
  },
  {
    id: 'work',
    name: 'Work',
    title: 'Our Work',
    description: 'Discover our portfolio of innovative projects. From WebGL experiences to real-time 3D applications, each project showcases our commitment to excellence and creativity.',
    position: new THREE.Vector3(-25, 5, 5),
    color: 0xff00ff, // Magenta
    size: 3.5,
    particleCount: 80
  },
  {
    id: 'services',
    name: 'Services',
    title: 'Services',
    description: 'We offer a range of services including 3D web development, interactive experiences, VR/AR applications, creative coding, and technical consultation. Let us bring your vision to life.',
    position: new THREE.Vector3(10, -5, 20),
    color: 0x22c55e, // Green
    size: 3,
    particleCount: 60
  },
  {
    id: 'contact',
    name: 'Contact',
    title: 'Get in Touch',
    description: 'Ready to start your project? We\'d love to hear from you. Reach out to discuss your ideas, get a quote, or simply say hello.',
    position: new THREE.Vector3(-15, 0, 15),
    color: 0xec4899, // Pink
    size: 2.5,
    particleCount: 50
  }
];

export class ContentNodes {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      enableParticles: true,
      enableGlow: true,
      enablePulse: true,
      ...options
    };
    
    this.nodes = [];
    this.nodeGroup = new THREE.Group();
    this.clock = new THREE.Clock();
    
    this.hoveredNode = null;
    this.selectedNode = null;
    
    this.init();
  }
  
  init() {
    NODE_DATA.forEach((data, index) => {
      const node = this.createNode(data, index);
      this.nodes.push(node);
      this.nodeGroup.add(node.group);
    });
    
    this.scene.add(this.nodeGroup);
  }
  
  createNode(data, index) {
    const group = new THREE.Group();
    group.position.copy(data.position);
    group.userData = {
      id: data.id,
      name: data.name,
      title: data.title,
      description: data.description,
      index: index,
      isNode: true
    };
    
    // Main sphere (core)
    const coreGeometry = new THREE.IcosahedronGeometry(data.size, 2);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.userData.isCore = true;
    group.add(core);
    
    // Inner glow sphere
    if (this.options.enableGlow) {
      const glowGeometry = new THREE.IcosahedronGeometry(data.size * 1.2, 2);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(data.color) },
          intensity: { value: 0.6 },
          time: { value: 0 }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float intensity;
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float fresnel = pow(1.0 - abs(dot(vNormal, viewDirection)), 3.0);
            
            // Pulse effect
            float pulse = sin(time * 2.0) * 0.1 + 0.9;
            
            vec3 glow = color * fresnel * intensity * pulse;
            float alpha = fresnel * intensity * pulse;
            
            gl_FragColor = vec4(glow, alpha * 0.5);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.userData.isGlow = true;
      group.add(glow);
    }
    
    // Outer ring
    const ringGeometry = new THREE.TorusGeometry(data.size * 1.8, 0.1, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.userData.isRing = true;
    group.add(ring);
    
    // Orbiting particles
    if (this.options.enableParticles) {
      const particles = this.createOrbitingParticles(data);
      particles.userData.isParticles = true;
      group.add(particles);
    }
    
    // Connection lines (subtle)
    if (index > 0) {
      const connectionLine = this.createConnectionLine(
        NODE_DATA[0].position,
        data.position,
        data.color
      );
      this.nodeGroup.add(connectionLine);
    }
    
    return {
      group,
      data,
      core,
      ring,
      materials: {
        core: coreMaterial,
        ring: ringMaterial
      },
      initialScale: 1,
      targetScale: 1
    };
  }
  
  createOrbitingParticles(data) {
    const particleCount = data.particleCount;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const orbitData = new Float32Array(particleCount * 3); // radius, speed, phase
    
    const color = new THREE.Color(data.color);
    const orbitRadius = data.size * 2;
    
    for (let i = 0; i < particleCount; i++) {
      // Initial position on orbit
      const radius = orbitRadius + (Math.random() - 0.5) * data.size * 0.5;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * data.size;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Color with slight variation
      colors[i * 3] = color.r * (0.8 + Math.random() * 0.4);
      colors[i * 3 + 1] = color.g * (0.8 + Math.random() * 0.4);
      colors[i * 3 + 2] = color.b * (0.8 + Math.random() * 0.4);
      
      // Size
      sizes[i] = 0.5 + Math.random() * 1.5;
      
      // Orbit data: radius, speed, initial phase
      orbitData[i * 3] = radius;
      orbitData[i * 3 + 1] = (0.2 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1);
      orbitData[i * 3 + 2] = angle;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('orbit', new THREE.BufferAttribute(orbitData, 3));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: window.devicePixelRatio }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute vec3 orbit; // radius, speed, phase
        varying vec3 vColor;
        uniform float time;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          
          // Animate position on orbit
          float radius = orbit.x;
          float speed = orbit.y;
          float phase = orbit.z;
          float angle = phase + time * speed;
          
          vec3 newPosition = position;
          newPosition.x = cos(angle) * radius;
          newPosition.z = sin(angle) * radius;
          
          vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
          gl_PointSize = size * pixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
    
    return new THREE.Points(geometry, material);
  }
  
  createConnectionLine(start, end, color) {
    const points = [];
    const segments = 50;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new THREE.Vector3().lerpVectors(start, end, t);
      
      // Add some curve
      const wave = Math.sin(t * Math.PI) * 2;
      point.y += wave;
      
      points.push(point);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    
    return new THREE.Line(geometry, material);
  }
  
  /**
   * Update nodes each frame
   */
  update(delta, elapsed) {
    this.nodes.forEach((node, index) => {
      // Rotate ring
      if (node.ring) {
        node.ring.rotation.z += delta * 0.2;
      }
      
      // Update glow shader time
      node.group.children.forEach(child => {
        if (child.userData.isGlow && child.material.uniforms) {
          child.material.uniforms.time.value = elapsed;
        }
        if (child.userData.isParticles && child.material.uniforms) {
          child.material.uniforms.time.value = elapsed;
        }
      });
      
      // Pulse core emissive
      if (this.options.enablePulse && node.materials.core) {
        const pulse = Math.sin(elapsed * 2 + index) * 0.15 + 0.5;
        node.materials.core.emissiveIntensity = pulse;
      }
      
      // Smooth scale transitions
      const currentScale = node.group.scale.x;
      const targetScale = node.targetScale;
      if (Math.abs(currentScale - targetScale) > 0.01) {
        const newScale = currentScale + (targetScale - currentScale) * 0.1;
        node.group.scale.setScalar(newScale);
      }
      
      // Gentle float animation
      node.group.position.y = node.data.position.y + Math.sin(elapsed + index * 0.5) * 0.3;
    });
  }
  
  /**
   * Get all selectable meshes for raycasting
   */
  getSelectableMeshes() {
    const meshes = [];
    this.nodes.forEach(node => {
      // Only add core mesh for selection
      node.group.traverse(child => {
        if (child.userData.isCore) {
          meshes.push(child);
        }
      });
    });
    return meshes;
  }
  
  /**
   * Set hover state on a node
   */
  setHovered(nodeGroup) {
    // Reset previous hover
    if (this.hoveredNode && this.hoveredNode !== nodeGroup) {
      const prevNode = this.nodes.find(n => n.group === this.hoveredNode);
      if (prevNode) {
        prevNode.targetScale = prevNode.initialScale;
        prevNode.materials.core.emissiveIntensity = 0.5;
      }
    }
    
    this.hoveredNode = nodeGroup;
    
    if (nodeGroup) {
      const node = this.nodes.find(n => n.group === nodeGroup);
      if (node) {
        node.targetScale = node.initialScale * 1.15;
      }
    }
  }
  
  /**
   * Set selected state on a node
   */
  setSelected(nodeGroup) {
    this.selectedNode = nodeGroup;
  }
  
  /**
   * Get node data by index
   */
  getNodeData(index) {
    return NODE_DATA[index];
  }
  
  /**
   * Get node by index
   */
  getNode(index) {
    return this.nodes[index];
  }
  
  /**
   * Get all nodes
   */
  getNodes() {
    return this.nodes;
  }
  
  /**
   * Find node from any child mesh
   */
  findNodeFromMesh(mesh) {
    let current = mesh;
    while (current) {
      if (current.userData.isNode) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }
  
  /**
   * Set quality level
   */
  setQualityLevel(level) {
    this.nodes.forEach(node => {
      // Adjust particle visibility based on quality
      node.group.children.forEach(child => {
        if (child.userData.isParticles) {
          child.visible = level !== 'low';
        }
        if (child.userData.isGlow) {
          child.visible = level === 'high';
        }
      });
    });
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    this.nodes.forEach(node => {
      node.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    
    this.scene.remove(this.nodeGroup);
  }
}
