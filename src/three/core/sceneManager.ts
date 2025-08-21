import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import Stats from 'stats.js';

import { ViewCube } from './viewCube';

export class SceneManager {
  stats = null;
  scene = null;
  camera = null;
  renderer = null;
  //controls: OrbitControls;
  controls: ArcballControls;

  constructor() {
    this.initStats(); // workerRender
    this.initScene();
    this.initCamera();
    this.initRenderer(); // workerRender
    this.initControls(); // workerRender
    this.initLights(); // workerRender
    this.initHelpers(); // workerRender

    // setInterval(() => {
    //   const start = performance.now();
    //   while (performance.now() - start < 1000) {} // Блокируем поток на 100мс
    //   console.log('Main thread busy');
    // }, 1000);

    window.addEventListener('resize', this.handleWindowResize); // workerRender

    //this.startAnimationLoop(); // workerRender
    this.animate();

    new ViewCube({ containerId: 'container', controls: this.controls, animate: () => this.animate() });
  }

  initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);

    document.getElementById('stats').appendChild(this.stats.domElement);
    this.stats.domElement.style.left = 'auto';
    this.stats.domElement.style.right = '0';
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = 3;
    this.scene.add(cube);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(this.renderer.domElement);
  }

  initControls() {
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = false;
    // this.controls.dampingFactor = 0.05;

    this.controls = new ArcballControls(this.camera, this.renderer.domElement, this.scene);
    this.controls.enableAnimations = false;
    this.controls.addEventListener('change', () => this.animate());
    this.controls.addEventListener('start', () => this.animate());
    this.controls.addEventListener('end', () => this.animate());
  }

  initLights() {
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

  initHelpers() {
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
  }

  private handleWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  }
}
