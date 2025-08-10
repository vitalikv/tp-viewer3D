import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';

export class SceneManager {
  stats = null;
  scene = null;
  camera = null;
  renderer = null;
  controls = null;

  constructor() {
    this.stats = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

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

    this.startAnimationLoop(); // workerRender
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
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.dampingFactor = 0.05;
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  initHelpers() {
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
  }

  handleWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  startAnimationLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.stats.begin();

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      this.stats.end();
    };

    animate();
  }
}
