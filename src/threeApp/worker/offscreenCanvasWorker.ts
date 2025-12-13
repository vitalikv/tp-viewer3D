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

// Полифилл для requestAnimationFrame в воркере
if (typeof self.requestAnimationFrame === 'undefined') {
  let lastTime = 0;
  self.requestAnimationFrame = function (callback: FrameRequestCallback) {
    const currentTime = performance.now();
    const timeToCall = Math.max(0, 16 - (currentTime - lastTime));
    const id = self.setTimeout(() => {
      callback(currentTime + timeToCall);
    }, timeToCall);
    lastTime = currentTime + timeToCall;
    return id;
  };

  self.cancelAnimationFrame = function (id: number) {
    self.clearTimeout(id);
  };
}

// Расширяем тип сообщений
type WorkerMessage = { type: 'init'; canvas: OffscreenCanvas; container: any } | { type: 'resize'; width: number; height: number; left: number; top: number } | { type: 'event'; event: any } | { type: 'loadModel'; arrayBuffer: ArrayBuffer; filename: string } | { type: 'activateClippingBvh' };

class OffscreenCanvasWorker {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private controls!: ArcballControls;
  private container;
  private dpr = 1;

  constructor() {
    self.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleMessage(e.data);
  }

  private handleMessage(msg: WorkerMessage) {
    switch (msg.type) {
      case 'init':
        this.init(msg.canvas, msg.container);
        break;
      case 'resize':
        if (this.renderer && this.camera) {
          this.resize(msg.width, msg.height, msg.left, msg.top);
        }
        break;
      case 'event':
        if (this.controls) {
          this.controls.dispatchEvent(msg.event);
          SceneManager.inst().render();
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
    }
  }

  private async init(canvas: OffscreenCanvas, container) {
    console.log('Worker initialized');

    this.container = container;
    const width = this.container.width;
    const height = this.container.height;
    const left = this.container.left;
    const top = this.container.top;
    this.dpr = this.container.dpr;

    await SceneManager.inst().initWorker({ canvas, container: { width, height, left, top } });
    this.scene = SceneManager.inst().scene;
    this.renderer = SceneManager.inst().renderer;
    this.camera = SceneManager.inst().camera;
    this.controls = SceneManager.inst().controls;

    InitModel.inst();
    SelectionHandler.inst();
    MouseManager.inst();
    OutlineSelection.inst();
    BVHManager.inst();
    ClippingBvh.inst();
    AnimationManager.inst();

    EffectsManager.inst().init({ scene: SceneManager.inst().scene, camera: SceneManager.inst().camera, renderer: SceneManager.inst().renderer, container: this.container });
    OutlineSelection.inst().init({ outlinePass: EffectsManager.inst().outlinePass, composer: EffectsManager.inst().composer });
    MouseManager.inst().init(SceneManager.inst().camera);
    BVHManager.inst().init();

    InitModel.inst().setMerge({ merge: true });
  }

  private async loadModel(arrayBuffer: ArrayBuffer, filename: string) {
    try {
      this.sendProgress('Loading model...');

      await InitModel.inst().handleFileLoad(arrayBuffer);

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
    SceneManager.inst().setSizeContainer({ width, height, left, top });
    SceneManager.inst().cameraManager.resize();
  }
}

new OffscreenCanvasWorker();

