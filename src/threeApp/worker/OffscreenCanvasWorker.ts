import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';

import { SceneManager } from '@/threeApp/scene/SceneManager';
import { InitModel } from '@/threeApp/model/InitModel';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { MouseManager } from '@/threeApp/scene/MouseManager';
import { ApiUiToThree } from '@/api/apiLocal/ApiUiToThree';
import { InitScene } from '@/threeApp/scene/InitScene';
import { AssemblyJsonLoader } from '@/core/AssemblyJsonLoader';

type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; rect: { width: number; height: number; left: number; top: number } }
  | { type: 'resize'; width: number; height: number; left: number; top: number }
  | { type: 'event'; event: { kind: string; type: string; clientX?: number; clientY?: number; button?: number } }
  | { type: 'loadModelFromUrl'; url: string }
  | { type: 'loadAssemblyJson'; url: string }
  | { type: 'setAssemblyJson'; jsonData: unknown }
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
          const controls = this.controls as unknown as {
            handlePointerDown: (e: unknown) => void;
            handlePointerMove: (e: unknown) => void;
            handlePointerUp: (e: unknown) => void;
            handlePointerCancel: (e: unknown) => void;
            handleWheel: (e: unknown) => void;
          };
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
      case 'loadModelFromUrl':
        if (this.scene) {
          this.loadModelFromUrl(msg.url);
        }
        break;
      case 'loadAssemblyJson':
        this.loadAssemblyJson(msg.url);
        break;
      case 'setAssemblyJson':
        this.setAssemblyJson(msg.jsonData);
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

  private async init(canvas: OffscreenCanvas, rect: { width: number; height: number; left: number; top: number }) {
    this.rect = rect;
    const width = this.rect.width;
    const height = this.rect.height;
    const left = this.rect.left;
    const top = this.rect.top;

    await InitScene.init({ canvas, rect: { width, height, left, top }, initApiUiToThree: true });

    this.scene = SceneManager.inst().scene;
    this.renderer = SceneManager.inst().renderer;
    this.camera = SceneManager.inst().camera;
    this.controls = SceneManager.inst().controls;

    // Устанавливаем размеры контейнера для controls
    if (this.controls) {
      const controls = this.controls as unknown as {
        setContainerRect?: (rect: { width: number; height: number; left: number; top: number }) => void;
      };
      if (typeof controls.setContainerRect === 'function') {
        controls.setContainerRect({ width, height, left, top });
      }
    }

    this.controls.addEventListener('change', () => this.sendCameraState());
    this.controls.addEventListener('start', () => this.sendCameraState());
    this.controls.addEventListener('end', () => this.sendCameraState());
    this.sendCameraState();

    // Запрашиваем JSON данные у основного потока
    self.postMessage({ type: 'requestAssemblyJson' });
  }

  private extractBasePath(url: string): string {
    try {
      // В воркере нет self.location, используем URL напрямую
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastSlashIndex = pathname.lastIndexOf('/');
      if (lastSlashIndex >= 0) {
        return urlObj.origin + pathname.substring(0, lastSlashIndex + 1);
      }
      return urlObj.origin + '/';
    } catch (_e) {
      return './';
    }
  }

  private async fetchWithProgress(url: string, onProgress?: (percent: number) => void): Promise<ArrayBuffer> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (!done && result.value) {
        chunks.push(result.value);
        receivedLength += result.value.length;

        if (onProgress && total > 0) {
          const percent = Math.round((receivedLength / total) * 100);
          onProgress(percent);
          this.sendProgress(`Loading: ${percent}%`);
        }
      }
    }

    // Объединяем все chunks в один ArrayBuffer
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    return allChunks.buffer;
  }

  private async loadModelFromUrl(url: string) {
    try {
      this.sendProgress('Loading model...');

      const arrayBuffer = await this.fetchWithProgress(url, (percent) => {
        this.sendProgress(`Loading: ${percent}%`);
      });

      const basePath = this.extractBasePath(url);
      await InitModel.inst().handleFileLoad(arrayBuffer, basePath);

      // Отправляем информацию об анимациях в основной поток
      const animationManager = AnimationManager.inst();
      if (animationManager.hasAnimations()) {
        const { animations, maxDuration } = animationManager.getAnimationsInfo();
        self.postMessage({ type: 'animationsInfo', animations, maxDuration });
      }

      this.sendProgress(null);

      self.postMessage({ type: 'modelLoaded', filename: url });
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
    const gizmo = (this.controls as unknown as { _gizmos?: { position?: { toArray: () => number[] } } })._gizmos;
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

  private async loadAssemblyJson(url: string) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.json();
      AssemblyJsonLoader.inst().setJson(jsonData);

      self.postMessage({ type: 'assemblyJsonLoaded', url });
    } catch (error) {
      console.error('[WORKER] Ошибка загрузки JSON сборки:', error);
      self.postMessage({ type: 'assemblyJsonError', error: error.message });
    }
  }

  private setAssemblyJson(jsonData: unknown) {
    AssemblyJsonLoader.inst().setJson(jsonData);
  }
}

new OffscreenCanvasWorker();
