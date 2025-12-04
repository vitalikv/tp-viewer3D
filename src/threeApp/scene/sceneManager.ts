import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import Stats from 'stats.js';

import { CameraManager } from '@/threeApp/scene/cameraManager';
import { ClippingBvh } from '@/threeApp/clipping/clippingBvh';
import { EffectsManager } from '@/threeApp/scene/effectsManager';
import { ContextSingleton } from '@/threeApp/core/ContextSingleton';

import { WatermarkCanvas } from '@/watermark/watermarkCanvas';
import { Watermark3d } from '@/watermark/watermark3d';
import { ApiThreeToUi } from '@/api/apiLocal/apiThreeToUi';

export class SceneManager extends ContextSingleton<SceneManager> {
  stats = null;
  container: HTMLElement | any;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: ArcballControls;
  cameraManager: CameraManager;

  public async init({ container }) {
    this.container = container;

    this.initStats();
    this.initScene();
    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initLights();
    this.initHelpers();

    await WatermarkCanvas.init(this.container);
    Watermark3d.init(this.renderer);

    this.render();
  }

  public initWorker({ container }) {
    this.container = container;

    this.initScene();
    this.initCamera();
    this.initLights();
    this.initHelpers();
  }

  public getClientRect() {
    //return this.container instanceof HTMLElement ? this.container.getBoundingClientRect() : this.container;
    return this.container.virtDom ? this.container : this.container.getBoundingClientRect();
  }

  private initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);

    document.getElementById('stats').appendChild(this.stats.domElement);
    this.stats.domElement.style.left = 'auto';
    this.stats.domElement.style.right = '0';
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    const texture = this.createAdvancedGradient({
      color1: '#ffffff',
      color2: '#ffffff',
      // color2: '#c0c0c0',
      direction: 'radial',
      transitionSharpness: 0.7, // Очень плавный
      transitionPoint: 0.4, // Центр
      transitionWidth: 0.8, // Широкая зона перехода
    });

    this.scene.background = texture;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = 3;
    this.scene.add(cube);
  }

  private createAdvancedGradient(options: { color1: string | number | THREE.Color; color2: string | number | THREE.Color; direction: 'vertical' | 'horizontal' | 'radial'; transitionSharpness: number; transitionPoint: number; transitionWidth: number }) {
    const color1: string = '#' + new THREE.Color(options.color1).getHexString();
    const color2: string = '#' + new THREE.Color(options.color2).getHexString();
    const direction: string = options.direction;
    const transitionSharpness: number = options.transitionSharpness;
    const transitionPoint: number = options.transitionPoint;
    const transitionWidth: number = options.transitionWidth;

    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

    let gradient: CanvasGradient;
    if (direction === 'vertical') {
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    } else if (direction === 'horizontal') {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    } else {
      gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    }

    const mixColors = (color1: string, color2: string, weight: number): string => {
      const hex1: string = color1.replace('#', '');
      const hex2: string = color2.replace('#', '');

      const r1: number = parseInt(hex1.substring(0, 2), 16);
      const g1: number = parseInt(hex1.substring(2, 4), 16);
      const b1: number = parseInt(hex1.substring(4, 6), 16);

      const r2: number = parseInt(hex2.substring(0, 2), 16);
      const g2: number = parseInt(hex2.substring(2, 4), 16);
      const b2: number = parseInt(hex2.substring(4, 6), 16);

      const r: number = Math.round(r1 + (r2 - r1) * weight);
      const g: number = Math.round(g1 + (g2 - g1) * weight);
      const b: number = Math.round(b1 + (b2 - b1) * weight);

      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const startTransition: number = Math.max(0, transitionPoint - transitionWidth / 2);
    const endTransition: number = Math.min(1, transitionPoint + transitionWidth / 2);

    if (transitionSharpness < 0.2) {
      gradient.addColorStop(0, color1);
      gradient.addColorStop(transitionPoint - 0.001, color1);
      gradient.addColorStop(transitionPoint, color2);
      gradient.addColorStop(1, color2);
    } else {
      gradient.addColorStop(0, color1);
      gradient.addColorStop(startTransition, color1);

      const steps: number = Math.ceil(transitionSharpness * 10);
      for (let i: number = 0; i <= steps; i++) {
        const pos: number = startTransition + (endTransition - startTransition) * (i / steps);
        const blend: number = i / steps;
        gradient.addColorStop(pos, mixColors(color1, color2, blend));
      }

      gradient.addColorStop(endTransition, color2);
      gradient.addColorStop(1, color2);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture: THREE.Texture = new THREE.CanvasTexture(canvas);

    return texture;
  }

  private initCamera() {
    this.cameraManager = new CameraManager();
    this.cameraManager.init({ renderer: this.renderer });
    this.camera = this.cameraManager.getActiveCamera();
  }

  private initRenderer() {
    const rect = this.getClientRect();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.localClippingEnabled = true;
    document.getElementById('container').appendChild(this.renderer.domElement);
  }

  private initControls() {
    this.controls = new ArcballControls(this.camera, this.renderer.domElement, this.scene);
    this.controls.enableAnimations = false;
    this.controls.addEventListener('change', () => this.render());
    this.controls.addEventListener('start', () => this.render());
    this.controls.addEventListener('end', () => this.render());
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-1, 1, -1);
    directionalLight2.castShadow = true;
    this.scene.add(directionalLight2);
  }

  private initHelpers() {
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
  }

  public render() {
    if (!this.renderer) return;
    this.stats.begin();

    if (ClippingBvh.inst()) ClippingBvh.inst().performClipping();
    // не работает при вкл renderWorker
    if (EffectsManager.inst() && EffectsManager.inst().enabled) {
      const renderCalls = EffectsManager.inst().render();
      Watermark3d.renderOverlay();

      ApiThreeToUi.updateDrawCalls(renderCalls);
    } else {
      const camera = this.cameraManager.getActiveCamera();
      this.renderer.render(this.scene, camera);
      Watermark3d.renderOverlay();

      ApiThreeToUi.updateDrawCalls(this.renderer.info.render.calls);
    }

    this.controls.update();

    this.stats.end();
  }
}
