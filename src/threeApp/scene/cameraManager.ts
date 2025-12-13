import * as THREE from 'three';
import type { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import { Watermark3d } from '@/watermark/watermark3d';
import { SceneManager } from '@/threeApp/scene/sceneManager';
import { EffectsManager } from '@/threeApp/scene/effectsManager';
import { MouseManager } from '@/threeApp/scene/mouseManager';

export class CameraManager {
  private camPerspective: THREE.PerspectiveCamera;
  private camOrthographic: THREE.OrthographicCamera;
  private activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private options = { fov: 75, aspect: 1, near: 0.01, far: 1000, position: new THREE.Vector3(5, 5, 5) };
  private renderer: THREE.WebGLRenderer;

  public init({ renderer }) {
    this.renderer = renderer;

    this.initCameras();
    this.initEvents();
  }

  private initEvents() {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Enter') {
        const camera = this.getActiveCamera();
        const type = camera instanceof THREE.PerspectiveCamera ? 'Orthographic' : 'Perspective';
        this.setCamera({ type });
      }
    });
  }

  private initCameras() {
    this.camPerspective = this.createCamPerspective();
    this.camOrthographic = this.createCamOrthographic();

    this.setActiveCamera({ camera: this.camPerspective });
  }

  private createCamPerspective() {
    const rect = SceneManager.inst().getClientRect();
    const aspect = rect.width / rect.height;

    const camera = new THREE.PerspectiveCamera(this.options.fov, aspect, this.options.near, this.options.far);
    camera.position.set(this.options.position.x, this.options.position.y, this.options.position.z);
    camera.lookAt(0, 0, 0);
    camera.userData.state = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: new THREE.Vector3() };
    camera.userData.start = { dir: camera.position.clone().normalize(), dist: new THREE.Vector3().distanceTo(camera.position) };

    return camera;
  }

  private createCamOrthographic() {
    const rect = SceneManager.inst().getClientRect();

    const halfFovV = THREE.MathUtils.DEG2RAD * 45 * 0.5;
    const halfFovH = Math.atan((rect.width / rect.height) * Math.tan(halfFovV));
    const dist = new THREE.Vector3().distanceTo(this.options.position);
    const halfW = dist * Math.tan(halfFovH);
    const halfH = dist * Math.tan(halfFovV);

    const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, this.options.near, this.options.far);
    camera.position.set(this.options.position.x, this.options.position.y, this.options.position.z);
    camera.lookAt(0, 0, 0);
    camera.userData.state = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: new THREE.Vector3() };
    camera.userData.start = { dir: camera.position.clone().normalize(), dist: new THREE.Vector3().distanceTo(camera.position) };

    return camera;
  }

  public resize = () => {
    Watermark3d.renderWatermark();

    const rect = SceneManager.inst().getClientRect();

    this.camPerspective.aspect = rect.width / rect.height;
    this.camPerspective.updateProjectionMatrix();

    const halfFovV = THREE.MathUtils.DEG2RAD * 45 * 0.5;
    const halfFovH = Math.atan((rect.width / rect.height) * Math.tan(halfFovV));

    const halfW = 7 * Math.tan(halfFovH);
    const halfH = 7 * Math.tan(halfFovV);
    this.camOrthographic.left = -halfW;
    this.camOrthographic.right = halfW;
    this.camOrthographic.top = halfH;
    this.camOrthographic.bottom = -halfH;
    this.camOrthographic.updateProjectionMatrix();

    this.renderer.setSize(rect.width, rect.height, false);

    // не работает при вкл renderWorker
    if (EffectsManager.inst() && EffectsManager.inst().enabled) {
      EffectsManager.inst().setSize();
    }

    SceneManager.inst().render();
  };

  public setActiveCamera({ camera }) {
    this.activeCamera = camera;
  }

  public getActiveCamera() {
    return this.activeCamera;
  }

  private getCamPerspective() {
    return this.camPerspective;
  }

  private getCamOrthographic() {
    return this.camOrthographic;
  }

  public setCamera({ type }: { type: 'Perspective' | 'Orthographic' }) {
    const cameraOld = this.getActiveCamera();

    if (type === 'Perspective') {
      this.setActiveCamera({ camera: this.getCamPerspective() });
    }
    if (type === 'Orthographic') {
      this.setActiveCamera({ camera: this.getCamOrthographic() });
    }

    const camera = this.getActiveCamera();
    const gizmosPos = SceneManager.inst().controls['_gizmos'].position.clone();

    camera.position.copy(cameraOld.position.clone());
    camera.quaternion.copy(cameraOld.quaternion.clone());
    camera.up.copy(cameraOld.up.clone());
    camera.updateProjectionMatrix();

    SceneManager.inst().controls.object = camera;
    SceneManager.inst().controls['_gizmos'].position.copy(gizmosPos);
    SceneManager.inst().controls.update();

    if (EffectsManager.inst() && EffectsManager.inst().enabled) {
      EffectsManager.inst().renderPass.camera = camera;
      EffectsManager.inst().outlinePass.renderCamera = camera;
    }

    MouseManager.inst().updateCamera(camera);

    this.resize();
    SceneManager.inst().render();
  }

  public zoomCameraToFitModel(options: { center: THREE.Vector3; radius: number; maxDim: number }) {
    const sceneManager = SceneManager.inst();
    if (!sceneManager) return;

    const camera = this.getActiveCamera();
    const controls = sceneManager.controls;
    if (!camera || !controls) return;

    const target = options.center;
    const arcballControls = controls as ArcballControls & { target: THREE.Vector3 };
    arcballControls.target.copy(target);

    const direction = camera.position.clone().sub(target);
    if (direction.lengthSq() === 0) {
      direction.set(0, 0, 1);
    }
    direction.normalize();

    let distance = Math.max(options.radius, options.maxDim * 0.5);

    if (camera instanceof THREE.PerspectiveCamera) {
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const halfFov = Math.max(Math.min(fovRad / 2, Math.PI / 2 - 0.01), 0.1);
      const projectedDistance = options.radius / Math.sin(halfFov);
      distance = Math.max(distance, projectedDistance);
    }

    distance = distance * 1.2 + 0.5;

    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    controls.update();
    sceneManager.render();
  }
}
