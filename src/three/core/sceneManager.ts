import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import Stats from 'stats.js';

import { threeApp } from '../threeApp';
import { ViewCube } from './viewCube';

export class SceneManager {
  stats = null;
  container: HTMLElement | any;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: ArcballControls;

  public init({ container }) {
    this.container = container;

    this.initStats();
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLights();
    this.initHelpers();
    window.addEventListener('resize', this.handleWindowResize);

    // setInterval(() => {
    //   const start = performance.now();
    //   while (performance.now() - start < 1000) {} // Блокируем поток на 100мс
    //   console.log('Main thread busy');
    // }, 1000);

    //this.startAnimationLoop();
    this.animate();

    new ViewCube({ containerId: 'container', controls: this.controls, animate: () => this.animate() });
  }

  public initWorker({ container }) {
    this.container = container;

    this.initScene();
    this.initCamera();
    this.initLights();
    this.initHelpers();
  }

  private getClientRect() {
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = 3;
    this.scene.add(cube);
  }

  private initCamera() {
    const rect = this.getClientRect();

    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.01, 1000);
    this.camera.position.set(5, 5, 5);
  }

  private initRenderer() {
    const rect = this.getClientRect();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(this.renderer.domElement);
  }

  private initControls() {
    this.controls = new ArcballControls(this.camera, this.renderer.domElement, this.scene);
    this.controls.enableAnimations = false;
    this.controls.addEventListener('change', () => this.animate());
    this.controls.addEventListener('start', () => this.animate());
    this.controls.addEventListener('end', () => this.animate());
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

  private handleWindowResize = () => {
    const rect = this.getClientRect();

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
    }

    // не работает при вкл renderWorker
    if (threeApp.effectsManager && threeApp.effectsManager.enabled) {
      threeApp.effectsManager.setSize();
    }

    this.animate();
  };

  private startAnimationLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.stats.begin();

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      this.stats.end();
    };

    animate();
  }

  private animate() {
    if (!this.renderer) return;
    this.stats.begin();

    // не работает при вкл renderWorker
    if (threeApp.effectsManager && threeApp.effectsManager.enabled) {
      threeApp.effectsManager.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.controls.update();

    //console.log(this.renderer.info.render.calls);

    this.stats.end();
  }
}
