import * as THREE from 'three';
import { ContextSingleton } from '@/core/ContextSingleton';
import { SceneManager } from '@/threeApp/scene/SceneManager';
import { ViewCube } from '@/threeApp/scene/ViewCube';
import { OffscreenCanvasManager } from '@/threeApp/worker/OffscreenCanvasManager';
import { ArcballControls } from '@/threeApp/worker/ArcballControls';
import { ModelUrlLoader } from '@/threeApp/model/ModelUrlLoader';
import { InitScene } from '@/threeApp/scene/InitScene';

export class ThreeApp extends ContextSingleton<ThreeApp> {
  public isWorker = true;

  async init() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    const rect = canvas.getBoundingClientRect();
    const rectParams = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    };

    if (this.isWorker) {
      OffscreenCanvasManager.inst().init({ canvas });
    } else {
      await InitScene.init({ canvas, rect: rectParams });
    }

    this.initResizeObserver(canvas);

    const container = document.getElementById('container');
    if (this.isWorker) {
      this.initViewCubeWorker(container);
    } else {
      new ViewCube({ container, controls: SceneManager.inst().controls, animate: () => SceneManager.inst().render() });
    }
  }

  public async loadModel(
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ): Promise<boolean> {
    try {
      return await ModelUrlLoader.inst().loadFromUrl(url, {
        onProgress:
          callbacks?.onProgress ||
          ((percent) => {
            console.log(`Загрузка модели: ${percent}%`);
          }),
        onLoaded:
          callbacks?.onLoaded ||
          ((url) => {
            console.log(`Модель успешно загружена: ${url}`);
          }),
        onError:
          callbacks?.onError ||
          ((error) => {
            console.error(`Ошибка загрузки модели: ${error}`);
          }),
      });
    } catch (error) {
      console.error('Ошибка при загрузке модели:', error);
      throw error;
    }
  }

  private initResizeObserver(canvas: HTMLCanvasElement) {
    const resizeHandler = () => {
      const rect = canvas.getBoundingClientRect();
      if (this.isWorker) {
        const worker = OffscreenCanvasManager.inst().worker;
        if (worker) {
          worker.postMessage({
            type: 'resize',
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top,
          });
        }
      } else {
        SceneManager.inst().handleResize({ width: rect.width, height: rect.height, left: rect.left, top: rect.top });
      }
    };
    const resizeObserver = new ResizeObserver(resizeHandler);
    resizeObserver.observe(canvas);
  }

  private initViewCubeWorker(container: HTMLElement | null) {
    const camera = new THREE.PerspectiveCamera();
    const gizmoPos = new THREE.Vector3();
    const listeners = new Map<string, Array<() => void>>();

    const addListener = (event: string, callback: () => void) => {
      const arr = listeners.get(event) || [];
      arr.push(callback);
      listeners.set(event, arr);
    };

    const removeListener = (event: string, callback: () => void) => {
      const arr = listeners.get(event);
      if (!arr) return;
      const idx = arr.indexOf(callback);
      if (idx >= 0) {
        arr.splice(idx, 1);
      }
    };

    const dispatch = (event: string) => {
      const arr = listeners.get(event);
      if (!arr) return;
      arr.forEach((cb) => cb());
    };

    interface ControlsProxy {
      object: THREE.PerspectiveCamera;
      _gizmos: { position: THREE.Vector3 };
      addEventListener: (event: string, callback: () => void) => void;
      removeEventListener: (event: string, callback: () => void) => void;
      update: () => void;
    }

    const controlsProxy: ControlsProxy = {
      object: camera,
      _gizmos: { position: gizmoPos },
      addEventListener: addListener,
      removeEventListener: removeListener,
      update: () => {},
    };

    const viewCube = new ViewCube({
      container: container!,
      controls: controlsProxy as unknown as ArcballControls,
      animate: () => {},
      onOrientationChange: ({ position, quaternion, up }) => {
        OffscreenCanvasManager.inst().setCameraPose({ position, quaternion, up });
      },
    });

    OffscreenCanvasManager.inst().onCameraState((data) => {
      camera.position.fromArray(data.position);
      camera.quaternion.fromArray(data.quaternion);
      camera.up.fromArray(data.up);
      gizmoPos.fromArray(data.gizmoPosition || [0, 0, 0]);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      dispatch('change');
      viewCube.updateViewCube();
    });
  }
}
