import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';

import { SceneManager } from '@/threeApp/scene/sceneManager';
import { InitModel } from '@/threeApp/model/initModel';
import { AnimationManager } from '../animation/animationManager';
import { BVHManager } from '../bvh/bvhManager';
import { OutlineSelection } from '../selection/outlineSelection';
import { ClippingBvh } from '../clipping/clippingBvh';
import { SelectionHandler } from '../selection/selectionHandler';
import { MouseManager } from '../scene/mouseManager';
import { EffectsManager } from '../scene/effectsManager';

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
          this.resize(msg.width, msg.height, msg.left, msg.top);
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
          const model = InitModel.inst().getModel();
          if (model) {
            ClippingBvh.inst().initClipping({ model });
            SceneManager.inst().render();
          }
        }
        break;
      case 'setPlanePosition':
        if (this.scene) {
          ClippingBvh.inst().setPlanePosition(msg.x, msg.y, msg.z);
          SceneManager.inst().render();
        }
        break;
      case 'setPlaneRotation':
        if (this.scene) {
          ClippingBvh.inst().setPlaneRotation(msg.x, msg.y, msg.z);
          SceneManager.inst().render();
        }
        break;
      case 'resetPlane':
        if (this.scene) {
          ClippingBvh.inst().resetPlane();
          SceneManager.inst().render();
        }
        break;
      case 'deActivateClippingBvh':
        if (this.scene) {
          ClippingBvh.inst().destroy();
          SceneManager.inst().render();
        }
        break;
      case 'toggleUseBVH':
        if (this.scene) {
          const act = !ClippingBvh.inst().getUseBVH();
          ClippingBvh.inst().setUseBVH(act);
        }
        break;
      case 'toggleHelperBVH':
        if (this.scene) {
          const act = !ClippingBvh.inst().getHelperBVH();
          ClippingBvh.inst().setHelperBVH(act);
        }
        break;
      case 'toggleModel':
        if (this.scene) {
          const act = !ClippingBvh.inst().getModel();
          ClippingBvh.inst().setModel(act);
        }
        break;
      case 'toggleWireframe':
        if (this.scene) {
          const act = !ClippingBvh.inst().getWireframe();
          ClippingBvh.inst().setWireframe(act);
        }
        break;
      case 'toggleInvertPlane':
        if (this.scene) {
          const act = !ClippingBvh.inst().getInvertPlane();
          ClippingBvh.inst().setInvertPlane(act);
        }
        break;
      case 'toggleShowPlane':
        if (this.scene) {
          const act = !ClippingBvh.inst().getShowPlane();
          ClippingBvh.inst().setShowPlane(act);
        }
        break;
      case 'playAnimation':
        if (this.scene) {
          AnimationManager.inst().play();
        }
        break;
      case 'pauseAnimation':
        if (this.scene) {
          AnimationManager.inst().pause();
        }
        break;
      case 'setAnimationPosStart':
        if (this.scene) {
          AnimationManager.inst().setAnimationPosStart();
        }
        break;
      case 'setAnimationPosEnd':
        if (this.scene) {
          AnimationManager.inst().setAnimationPosEnd();
        }
        break;
      case 'setAnimationIndex':
        if (this.scene) {
          AnimationManager.inst().setAnimationIndex(msg.index);
        }
        break;
      case 'setAnimationTime':
        if (this.scene) {
          AnimationManager.inst().setAnimationTime(msg.time);
        }
        break;
      case 'rebuildAnimationBVH':
        if (this.scene) {
          AnimationManager.inst().rebuildBVHIfNeeded();
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

  private resize(width: number, height: number, left: number, top: number) {
    SceneManager.inst().setClientRect({ width, height, left, top });
    SceneManager.inst().cameraManager.resize();

    if (this.controls) {
      const controls = this.controls as any;
      if (typeof controls.setContainerRect === 'function') {
        controls.setContainerRect({ width, height, left, top });
      }
    }
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
