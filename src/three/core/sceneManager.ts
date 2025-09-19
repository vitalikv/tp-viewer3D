import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import Stats from 'stats.js';

import { threeApp } from '../threeApp';
import { CameraManager } from './cameraManager';
import { ViewCube } from './viewCube';

export class SceneManager {
  stats = null;
  container: HTMLElement | any;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: ArcballControls;
  cameraManager: CameraManager;

  public init({ container }) {
    this.container = container;

    this.initStats();
    this.initScene();
    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initLights();
    this.initHelpers();

    // setInterval(() => {
    //   const start = performance.now();
    //   while (performance.now() - start < 1000) {} // Блокируем поток на 100мс
    //   console.log('Main thread busy');
    // }, 1000);

    //this.startAnimationLoop();
    this.render();

    new ViewCube({ containerId: 'container', controls: this.controls, animate: () => this.render() });
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
    //this.scene.background = new THREE.Color(0xe3e4e7);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      './Grey-blue T-FLEX 16.jpg',
      (texture) => {
        this.scene.background = texture;
        this.render();
      },
      () => {},
      (error) => {
        console.error('Ошибка загрузки фона:', error);
      }
    );

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = 3;
    this.scene.add(cube);
  }

  private initCamera() {
    this.cameraManager = new CameraManager();
    this.cameraManager.init({ container: this.container, renderer: this.renderer });
    this.camera = this.cameraManager.getActiveCamera();

    // const rect = this.getClientRect();
    // this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.01, 1000);
    // this.camera.position.set(5, 5, 5);
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

  private startAnimationLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.stats.begin();

      const camera = this.cameraManager.getActiveCamera();
      this.controls.update();
      this.renderer.render(this.scene, camera);

      this.stats.end();
    };

    animate();
  }

  public render() {
    if (!this.renderer) return;
    this.stats.begin();

    // не работает при вкл renderWorker
    if (threeApp.effectsManager && threeApp.effectsManager.enabled) {
      threeApp.effectsManager.render();
    } else {
      const camera = this.cameraManager.getActiveCamera();
      this.renderer.render(this.scene, camera);
    }

    this.controls.update();

    //console.log(this.renderer.info.render.calls);

    this.stats.end();
  }
}
