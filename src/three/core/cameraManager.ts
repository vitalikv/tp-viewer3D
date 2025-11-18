import * as THREE from 'three';
//import { uiMain, sceneManager, effectsManager, controls, mouseManager } from '../../../index';
import { threeApp } from '../threeApp';
import { Watermark3d } from '../../watermark/watermark3d';

export class CameraManager {
  private container: HTMLElement;
  private cam3D: THREE.PerspectiveCamera;
  private camTop: THREE.OrthographicCamera;
  private activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private options = { fov: 75, aspect: 1, near: 0.01, far: 1000, position: new THREE.Vector3(5, 5, 5) };
  private renderer: THREE.WebGLRenderer;

  public init({ container, renderer }) {
    this.container = container;
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

    window.addEventListener('resize', this.handleResize);
  }

  private initCameras() {
    this.cam3D = this.createCam3D();
    this.camTop = this.createCamTop();

    this.setActiveCamera({ camera: this.cam3D });
  }

  private createCam3D() {
    const rect = threeApp.sceneManager.getClientRect();
    const aspect = rect.width / rect.height;

    const camera = new THREE.PerspectiveCamera(this.options.fov, aspect, this.options.near, this.options.far);
    camera.position.set(this.options.position.x, this.options.position.y, this.options.position.z);
    camera.lookAt(0, 0, 0);
    camera.userData.state = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: new THREE.Vector3() };
    camera.userData.start = { dir: camera.position.clone().normalize(), dist: new THREE.Vector3().distanceTo(camera.position) };

    return camera;
  }

  private createCamTop() {
    const rect = threeApp.sceneManager.getClientRect();

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

  private handleResize = () => {
    Watermark3d.renderWatermark();

    const rect = threeApp.sceneManager.getClientRect();

    this.cam3D.aspect = rect.width / rect.height;
    this.cam3D.updateProjectionMatrix();

    const halfFovV = THREE.MathUtils.DEG2RAD * 45 * 0.5;
    const halfFovH = Math.atan((rect.width / rect.height) * Math.tan(halfFovV));

    const halfW = 7 * Math.tan(halfFovH);
    const halfH = 7 * Math.tan(halfFovV);
    this.camTop.left = -halfW;
    this.camTop.right = halfW;
    this.camTop.top = halfH;
    this.camTop.bottom = -halfH;
    this.camTop.updateProjectionMatrix();

    this.renderer.setSize(rect.width, rect.height);

    // не работает при вкл renderWorker
    if (threeApp.effectsManager && threeApp.effectsManager.enabled) {
      threeApp.effectsManager.setSize();
    }

    threeApp.sceneManager.render();
  };

  public setActiveCamera({ camera }) {
    this.activeCamera = camera;
  }

  public getActiveCamera() {
    return this.activeCamera;
  }

  private getCam3D() {
    return this.cam3D;
  }

  private getCamTop() {
    return this.camTop;
  }

  public updateTargetOnModel({ center }: { center: THREE.Vector3 }) {
    const orbitControls = controls.getControls();
    orbitControls.target.copy(center);

    const cam3D = this.getCam3D();
    cam3D.position.add(center);
    cam3D.lookAt(center);
    cam3D.updateProjectionMatrix();
    this.saveCameraState({ camera: cam3D });

    const camTop = this.getCamTop();
    camTop.position.add(center);
    camTop.lookAt(center);
    camTop.updateProjectionMatrix();
    this.saveCameraState({ camera: camTop });

    controls.update();
    threeApp.sceneManager.render();
  }

  public setCamera({ type }: { type: 'Perspective' | 'Orthographic' }) {
    //this.saveCameraState({ camera: this.getActiveCamera() });

    const cameraOld = this.getActiveCamera();

    if (type === 'Perspective') {
      this.setActiveCamera({ camera: this.getCam3D() });
    }
    if (type === 'Orthographic') {
      this.setActiveCamera({ camera: this.getCamTop() });
    }

    //uiMain.uiBtnCamera.clickOnBtn({ type });

    const camera = this.getActiveCamera();
    const gizmosPos = threeApp.sceneManager.controls['_gizmos'].position.clone();

    camera.position.copy(cameraOld.position.clone());
    camera.quaternion.copy(cameraOld.quaternion.clone());
    camera.up.copy(cameraOld.up.clone());
    camera.updateProjectionMatrix();

    threeApp.sceneManager.controls.object = camera;
    threeApp.sceneManager.controls['_gizmos'].position.copy(gizmosPos);
    threeApp.sceneManager.controls.update();

    if (threeApp.effectsManager && threeApp.effectsManager.enabled) {
      threeApp.effectsManager.renderPass.camera = camera;
      threeApp.effectsManager.outlinePass.renderCamera = camera;
    }

    // mouseManager.setCamera({ camera: this.getActiveCamera() });
    // this.restoreCameraState();

    threeApp.sceneManager.render();
  }

  private saveCameraState({ camera }: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera }) {
    const orbitControls = controls.getControls();

    camera.userData.state = {
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
      target: orbitControls.target.clone(),
    };

    console.log(camera.userData.state);
  }

  private restoreCameraState() {
    const orbitControls = controls.getControls();
    const state = this.activeCamera.userData.state;

    if (state) {
      this.activeCamera.position.copy(state.position);
      this.activeCamera.rotation.copy(state.rotation);
      orbitControls.target.copy(state.target);
      controls.update();
    }
  }
}
