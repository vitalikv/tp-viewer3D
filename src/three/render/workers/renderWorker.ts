import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VirtualOrbitControls } from './orbitControlsWorker';

type WorkerMessage = { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number } | { type: 'resize'; width: number; height: number; dpr?: number } | { type: 'event'; event: any };

class RenderWorker {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: VirtualOrbitControls;
  private width = 300;
  private height = 150;
  private dpr = 1;

  constructor() {
    self.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleMessage(e.data);
  }

  private handleMessage(msg: WorkerMessage) {
    switch (msg.type) {
      case 'init':
        this.init(msg.canvas, msg.width, msg.height, msg.dpr);
        break;
      case 'resize':
        this.resize(msg.width, msg.height, msg.dpr ?? this.dpr);
        break;
      case 'event':
        this.controls.dispatchEvent(msg.event);
        break;
    }
  }

  private init(canvas: OffscreenCanvas, width: number, height: number, dpr: number) {
    console.log('Worker initialized in thread:', self.name);
    console.log('Worker location:', self.location.href);

    this.width = width;
    this.height = height;
    this.dpr = dpr;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(3, 3, 6);

    // Controls
    this.controls = new VirtualOrbitControls(this.camera, { width, height });
    (this.controls as OrbitControls).enableDamping = false;
    (this.controls as OrbitControls).dampingFactor = 0.05;
    (this.controls as OrbitControls).enableZoom = true;
    (this.controls as OrbitControls).enablePan = true;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff);
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 7);
    this.scene.add(ambient, directional);

    // Test object
    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 100, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.4,
      metalness: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    // Start render loop
    this.animate();
  }

  private resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.controls.setSize(width, height);
  }

  private animate = () => {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    self.requestAnimationFrame(this.animate);
  };
}

new RenderWorker();
