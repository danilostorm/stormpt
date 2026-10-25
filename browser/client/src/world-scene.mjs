import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Stage renderer for original StormPT Stage SMD assets converted to GLB.
 * The stage is genuine but the game client is NOT yet playable.
 * This module has no fake character or game state. Production code must
 * supply a server-authorized position and a loaded character model.
 */
export class StormPTWorldScene {
  constructor(canvas, { pixelRatioLimit = 1.5, antialias = true } = {}) {
    if (!canvas) throw new Error('StormPT renderer requires canvas');
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111822);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200000);
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias, alpha: false, powerPreference: 'high-performance',
    });
    if (!this.renderer.capabilities.isWebGL2)
      throw new Error('StormPT Web requires WebGL2');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
    this.loader = new GLTFLoader();
    this.stage = null;
    this.frame = 0;
    this.lastSample = performance.now();
    this.sampleFrames = 0;
    this.fps = 0;
    this.running = false;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x414c62, 2.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(100, 200, 50);
    this.scene.add(sun);
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }
  resize() {
    const width = Math.max(1, this.canvas.clientWidth || this.canvas.width || 1);
    const height = Math.max(1, this.canvas.clientHeight || this.canvas.height || 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
  async loadStage(url, { signal } = {}) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const gltf = await this.loader.loadAsync(url);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!gltf.scene) throw new Error('GLB has no scene');
    const previous = this.stage;
    if (previous) this.scene.remove(previous);
    this.stage = gltf.scene;
    this.stage.name = 'StormPT real stage';
    this.stage.traverse(node => {
      if (!node.isMesh) return;
      node.frustumCulled = true;
      node.castShadow = false;
      node.receiveShadow = false;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of mats) {
        if (!material) continue;
        if (material.transparent && material.side === THREE.DoubleSide) {
          // Avoid Three.js' default two-pass transparent double-sided draw.
          // The original PT blending mode still needs shader-level matching.
          material.forceSinglePass = true;
        }
        if (material.map) {
          material.map.colorSpace = THREE.SRGBColorSpace;
          material.map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        }
      }
    });
    this.scene.add(this.stage);
    if (previous) this.disposeStage(previous);
    const bounds = new THREE.Box3().setFromObject(this.stage);
    if (bounds.isEmpty()) throw new Error('Real stage has empty bounds');
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(extent.x, extent.z);
    this.camera.position.set(center.x + radius * 0.32, center.y + radius * 0.34, center.z + radius * 0.50);
    this.camera.lookAt(center);
    this.camera.far = Math.max(20000, radius * 12);
    this.camera.updateProjectionMatrix();
    return { meshes: this.countMeshes(), geometryTriangles: this.countGeometryTriangles(), center: center.toArray(), extent: extent.toArray(), url };
  }
  countMeshes() {
    let count = 0;
    this.stage?.traverse(node => { if (node.isMesh) count++; });
    return count;
  }
  countGeometryTriangles() {
    let triangles = 0;
    this.stage?.traverse(node => {
      if (!node.isMesh) return;
      const g = node.geometry;
      const n = g.index ? g.index.count : g.getAttribute('position')?.count || 0;
      triangles += n / 3;
    });
    return triangles;
  }
  start() {
    if (this.running) return;
    this.running = true;
    const frame = (now) => {
      if (!this.running) return;
      this.renderer.render(this.scene, this.camera);
      this.frame++;
      this.sampleFrames++;
      if (now - this.lastSample >= 1000) {
        this.fps = Math.round(this.sampleFrames * 1000 / (now - this.lastSample));
        this.sampleFrames = 0;
        this.lastSample = now;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }
  stop() {
    this.running = false;
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
  }
  disposeStage(stage) {
    stage.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        for (const key of ['map','normalMap','roughnessMap','metalnessMap','alphaMap','emissiveMap']) {
          if (m[key]) m[key].dispose();
        }
        m.dispose();
      }
    });
  }
  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    if (this.stage) this.disposeStage(this.stage);
    this.renderer.dispose();
  }
}
