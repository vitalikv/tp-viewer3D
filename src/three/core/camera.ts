import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

export class Camera {
  public instance: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  constructor(renderer: THREE.WebGLRenderer) {
    this.instance = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.instance.position.set(5, 5, 5);

    this.controls = new OrbitControls(this.instance, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  updateAspectRatio(aspect: number): void {
    this.instance.aspect = aspect;
    this.instance.updateProjectionMatrix();
  }
}
