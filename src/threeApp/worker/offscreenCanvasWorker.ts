import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';

import { SceneManager } from '@/threeApp/scene/SceneManager';
import { InitModel } from '@/threeApp/model/InitModel';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { BVHManager } from '@/threeApp/bvh/bvhManager';
import { OutlineSelection } from '@/threeApp/selection/OutlineSelection';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { SelectionHandler } from '@/threeApp/selection/SelectionHandler';
import { MouseManager } from '@/threeApp/scene/MouseManager';
import { EffectsManager } from '@/threeApp/scene/EffectsManager';
import { ApiUiToThree } from '@/api/apiLocal/apiUiToThree';

type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; rect: any }
  | { type: 'resize'; width: number; height: number; left: number; top: number }
  | { type: 'event'; event: any }
  | { type: 'loadModel'; arrayBuffer: ArrayBuffer; filename: string }
  | { type: 'activateClippingBvh' }
  | { type: 'setPlanePosition'; x: number; y: number; z: number }
  | { type: 'setPlaneRotation'; x: number; y: number; z: number }
  | { type: 'resetPlane' }
  | { type: 'deActivateClippingBvh' }
  | { type: 'toggleUseBVH' }
  | { type: 'toggleHelperBVH' }
  | { type: 'toggleModel' }
  | { type: 'toggleWireframe' }
  | { type: 'toggleInvertPlane' }
  | { type: 'toggleShowPlane' }
  | { type: 'playAnimation' }
  | { type: 'pauseAnimation' }
  | { type: 'setAnimationPosStart' }
  | { type: 'setAnimationPosEnd' }
  | { type: 'setAnimationIndex'; index: number }
  | { type: 'setAnimationTime'; time: number }
  | { type: 'rebuildAnimationBVH' }
  | { type: 'setCameraPose'; position: number[]; quaternion: number[]; up: number[] };

class OffscreenCanvasWorker {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private controls!: ArcballControls;
  private rect;

  constructor() {
    self.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleMessage(e.data);
  }

  private handleMessage(msg: WorkerMessage) {
    switch (msg.type) {
      case 'init':
        this.init(msg.canvas, msg.rect);
        break;
      case 'resize':
        if (this.renderer && this.camera) {
          SceneManager.inst().handleResize({ width: msg.width, height: msg.height, left: msg.left, top: msg.top });
        }
        break;
      case 'event':
        if (this.controls) {
          const event = msg.event;
          const controls = this.controls as any;
          if (event.kind === 'pointer') {
            switch (event.type) {
              case 'pointerdown':
                controls.handlePointerDown(event);
                break;
              case 'pointermove':
                controls.handlePointerMove(event);
                break;
              case 'pointerup':
                controls.handlePointerUp(event);
                break;
              case 'pointercancel':
                controls.handlePointerCancel(event);
                break;
            }
          } else if (event.kind === 'wheel') {
            controls.handleWheel(event);
          }
        }
        if (msg.event.kind === 'pointer' && MouseManager.inst()) {
          MouseManager.inst().handlePointerEvent(msg.event.type, {
            clientX: msg.event.clientX,
            clientY: msg.event.clientY,
            button: msg.event.button,
          });
        }
        break;
      case 'loadModel':
        if (this.scene) {
          this.loadModel(msg.arrayBuffer, msg.filename);
        }
        break;
      case 'activateClippingBvh':
        if (this.scene) {
          ApiUiToThree.inst().activateClippingBvh();
        }
        break;
      case 'setPlanePosition':
        if (this.scene) {
          ApiUiToThree.inst().setPlanePosition(msg.x, msg.y, msg.z);
        }
        break;
      case 'setPlaneRotation':
        if (this.scene) {
          ApiUiToThree.inst().setPlaneRotation(msg.x, msg.y, msg.z);
        }
        break;
      case 'resetPlane':
        if (this.scene) {
          ApiUiToThree.inst().resetPlane();
        }
        break;
      case 'deActivateClippingBvh':
        if (this.scene) {
          ApiUiToThree.inst().deActivateClippingBvh();
        }
        break;
      case 'toggleUseBVH':
        if (this.scene) {
          ApiUiToThree.inst().toggleUseBVH();
        }
        break;
      case 'toggleHelperBVH':
        if (this.scene) {
          ApiUiToThree.inst().toggleHelperBVH();
        }
        break;
      case 'toggleModel':
        if (this.scene) {
          ApiUiToThree.inst().toggleModel();
        }
        break;
      case 'toggleWireframe':
        if (this.scene) {
          ApiUiToThree.inst().toggleWireframe();
        }
        break;
      case 'toggleInvertPlane':
        if (this.scene) {
          ApiUiToThree.inst().toggleInvertPlane();
        }
        break;
      case 'toggleShowPlane':
        if (this.scene) {
          ApiUiToThree.inst().toggleShowPlane();
        }
        break;
      case 'playAnimation':
        if (this.scene) {
          ApiUiToThree.inst().playAnimation();
        }
        break;
      case 'pauseAnimation':
        if (this.scene) {
          ApiUiToThree.inst().pauseAnimation();
        }
        break;
      case 'setAnimationPosStart':
        if (this.scene) {
          ApiUiToThree.inst().setAnimationPosStart();
        }
        break;
      case 'setAnimationPosEnd':
        if (this.scene) {
          ApiUiToThree.inst().setAnimationPosEnd();
        }
        break;
      case 'setAnimationIndex':
        if (this.scene) {
          ApiUiToThree.inst().setAnimationIndex(msg.index);
        }
        break;
      case 'setAnimationTime':
        if (this.scene) {
          ApiUiToThree.inst().setAnimationTime(msg.time);
        }
        break;
      case 'rebuildAnimationBVH':
        if (this.scene) {
          ApiUiToThree.inst().rebuildAnimationBVH();
        }
        break;
      case 'setCameraPose':
        this.applyCameraPose(msg);
        break;
    }
  }

  private async init(canvas: OffscreenCanvas, rect) {
    console.log('Worker initialized');

    this.rect = rect;
    const width = this.rect.width;
    const height = this.rect.height;
    const left = this.rect.left;
    const top = this.rect.top;

    await SceneManager.inst().init({ canvas, rect: { width, height, left, top } });
    this.scene = SceneManager.inst().scene;
    this.renderer = SceneManager.inst().renderer;
    this.camera = SceneManager.inst().camera;
    this.controls = SceneManager.inst().controls;

    // Устанавливаем размеры контейнера для controls
    if (this.controls) {
      const controls = this.controls as any;
      if (typeof controls.setContainerRect === 'function') {
        controls.setContainerRect({ width, height, left, top });
      }
    }

    InitModel.inst();
    SelectionHandler.inst();
    MouseManager.inst();
    OutlineSelection.inst();
    BVHManager.inst();
    ClippingBvh.inst();
    AnimationManager.inst();
    ApiUiToThree.inst();

    EffectsManager.inst().init({ scene: SceneManager.inst().scene, camera: SceneManager.inst().camera, renderer: SceneManager.inst().renderer });
    OutlineSelection.inst().init({ outlinePass: EffectsManager.inst().outlinePass, composer: EffectsManager.inst().composer });
    MouseManager.inst().init(SceneManager.inst().camera);
    BVHManager.inst().init();
    InitModel.inst().setMerge({ merge: true });

    this.controls.addEventListener('change', () => this.sendCameraState());
    this.controls.addEventListener('start', () => this.sendCameraState());
    this.controls.addEventListener('end', () => this.sendCameraState());
    this.sendCameraState();
  }

  private async loadModel(arrayBuffer: ArrayBuffer, filename: string) {
    try {
      this.sendProgress('Loading model...');

      await InitModel.inst().handleFileLoad(arrayBuffer);

      // Отправляем информацию об анимациях в основной поток
      const animationManager = AnimationManager.inst();
      if (animationManager.hasAnimations()) {
        const { animations, maxDuration } = animationManager.getAnimationsInfo();
        self.postMessage({ type: 'animationsInfo', animations, maxDuration });
      }

      this.sendProgress(null);
      console.log('[WORKER] Модель успешно загружена в воркере');

      self.postMessage({ type: 'modelLoaded', filename });
    } catch (error) {
      console.error('[WORKER] Ошибка загрузки модели:', error);
      this.sendProgress(null);
      self.postMessage({ type: 'modelError', error: error.message });
    }
  }

  private sendProgress(text: string | null) {
    self.postMessage({ type: 'progress', data: text });
  }

  private sendCameraState() {
    if (!this.camera || !this.controls) return;
    const gizmo = (this.controls as any)._gizmos;
    const gizmoPos = gizmo && gizmo.position ? gizmo.position.toArray() : [0, 0, 0];
    self.postMessage({
      type: 'cameraState',
      position: this.camera.position.toArray(),
      quaternion: this.camera.quaternion.toArray(),
      up: this.camera.up.toArray(),
      gizmoPosition: gizmoPos,
    });
  }

  private applyCameraPose(msg: Extract<WorkerMessage, { type: 'setCameraPose' }>) {
    if (!this.camera || !this.controls) return;
    this.camera.position.fromArray(msg.position);
    this.camera.quaternion.fromArray(msg.quaternion);
    this.camera.up.fromArray(msg.up);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.controls.update();
    this.sendCameraState();
    SceneManager.inst().render();
  }
}

new OffscreenCanvasWorker();
