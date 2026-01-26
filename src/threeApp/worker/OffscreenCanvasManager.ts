import * as THREE from 'three';
import { ContextSingleton } from '@/core/ContextSingleton';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { ApiThreeToUi } from '@/api/apiLocal/ApiThreeToUi';
import { UiPlayerAnimation } from '@/ui/UiPlayerAnimation';
import { UiDrawCallsDiv } from '@/ui/UiDrawCallsDiv';
import { AssemblyJsonLoader } from '@/core/AssemblyJsonLoader';

export class OffscreenCanvasManager extends ContextSingleton<OffscreenCanvasManager> {
  public isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
  public worker: Worker;
  private container: HTMLCanvasElement;
  private progressCallback?: (text: string | null) => void;
  private modelLoadedCallback?: (filename: string) => void;
  private modelErrorCallback?: (error: string) => void;
  private cameraStateCallback?: (data: {
    position: number[];
    quaternion: number[];
    up: number[];
    gizmoPosition?: number[];
  }) => void;

  private getWorkerUrl(): URL {
    const isDev = import.meta.env.DEV;
    console.log('isDev', isDev);
    if (isDev) {
      return new URL('./OffscreenCanvasWorker.ts', import.meta.url);
    }

    // Production режим: вычисляем путь к worker.js на основе структуры пакета
    // Используем import.meta.url для определения базового пути и заменяем имя файла
    // Если модуль в node_modules/viewer/dist/index.js, worker в node_modules/viewer/dist/worker.js
    // Если модуль в dist/index.js (локальная сборка), worker в dist/worker.js
    const currentUrl = new URL(import.meta.url);
    const currentPath = currentUrl.pathname;

    // Заменяем имя файла (index.js) на worker.js
    // Это работает для обоих случаев: node_modules и локальная сборка
    const workerPath = currentPath.replace(/[^/]+\.js$/, 'worker.js');

    return new URL(workerPath, currentUrl);
  }

  public init({ canvas }: { canvas: HTMLCanvasElement }) {
    const workerUrl = this.getWorkerUrl();

    this.worker = new Worker(workerUrl, { type: 'module' });

    this.container = canvas;

    const rect = this.getClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.initOffscreen({ canvas });
    this.setupEventListeners();
    this.setupWorkerMessageHandler();
  }

  private getClientRect() {
    return this.container.getBoundingClientRect();
  }

  private initOffscreen({ canvas }) {
    const offscreen = canvas.transferControlToOffscreen();

    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        rect: { width: canvas.width, height: canvas.height, dpr: window.devicePixelRatio },
      },
      [offscreen as Transferable]
    );
  }

  private setupEventListeners() {
    const pointerEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    pointerEvents.forEach((type) => {
      this.container.addEventListener(
        type,
        (e: PointerEvent) => {
          e.preventDefault();
          const rect = this.getClientRect();
          this.worker.postMessage({
            type: 'event',
            event: {
              kind: 'pointer',
              type,
              clientX: e.clientX - rect.left,
              clientY: e.clientY - rect.top,
              button: e.button,
              buttons: e.buttons,
              pointerId: e.pointerId,
              pointerType: e.pointerType,
            },
          });
        },
        { passive: false }
      );
    });

    this.container.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const rect = this.getClientRect();
        this.worker.postMessage({
          type: 'event',
          event: {
            kind: 'wheel',
            deltaY: e.deltaY,
            clientX: e.clientX - rect.left,
            clientY: e.clientY - rect.top,
          },
        });
      },
      { passive: false }
    );
  }

  private setupWorkerMessageHandler() {
    this.worker.onmessage = (e) => {
      const { type, data, filename, error, animations, maxDuration, time, maxTime, percent, isPlaying, value } = e.data;

      switch (type) {
        case 'progress':
          if (this.progressCallback) {
            this.progressCallback(data);
          }
          break;
        case 'animationsInfo':
          // Синхронизируем информацию об анимациях из воркера
          if (animations && animations.length > 0) {
            const animationClips = animations.map((animData) => {
              // Создаем упрощенный AnimationClip для синхронизации
              const clip = new THREE.AnimationClip(animData.name, animData.duration, []);
              return clip;
            });
            AnimationManager.inst().setAnimationsInfo(animationClips, maxDuration || 0);
            // Обновляем UI меню анимаций
            ApiThreeToUi.inst().updatePlayerMenu(animationClips);
          }
          break;
        case 'updatePlayerMenu':
          if (animations && animations.length > 0) {
            const animationClips = animations.map((animData) => {
              const clip = new THREE.AnimationClip(animData.name, animData.duration, []);
              return clip;
            });
            UiPlayerAnimation.inst().updatePlayerMenu(animationClips);
          }
          break;
        case 'updatePlayerTime':
          UiPlayerAnimation.inst().updatePlayerTime(time, maxTime);
          break;
        case 'updatePlayerCaret':
          UiPlayerAnimation.inst().updatePlayerCaret(percent, isPlaying);
          break;
        case 'updatePlayerBtnPlay':
          UiPlayerAnimation.inst().updateBtnPlay(isPlaying);
          break;
        case 'updateDrawCalls':
          UiDrawCallsDiv.inst().updateText(value);
          break;
        case 'modelLoaded':
          if (this.modelLoadedCallback) {
            this.modelLoadedCallback(filename);
          }
          break;
        case 'modelError':
          if (this.modelErrorCallback) {
            this.modelErrorCallback(error);
          }
          break;
        case 'cameraState':
          if (this.cameraStateCallback) {
            this.cameraStateCallback(e.data);
          }
          break;
        case 'requestAssemblyJson':
          // Если JSON уже загружен, отправляем его в воркер
          const jsonData = AssemblyJsonLoader.inst().getJson();
          if (jsonData !== undefined) {
            this.worker.postMessage({
              type: 'setAssemblyJson',
              jsonData: jsonData,
            });
          }
          break;
      }
    };
  }

  public loadModelFromUrl(
    url: string,
    callbacks?: {
      onProgress?: (text: string | null) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ) {
    if (callbacks) {
      this.progressCallback = callbacks.onProgress;
      this.modelLoadedCallback = callbacks.onLoaded;
      this.modelErrorCallback = callbacks.onError;
    }

    this.worker.postMessage({
      type: 'loadModelFromUrl',
      url: url,
    });
  }

  public dispose() {
    this.worker.terminate();
  }

  public onCameraState(
    callback: (data: { position: number[]; quaternion: number[]; up: number[]; gizmoPosition?: number[] }) => void
  ) {
    this.cameraStateCallback = callback;
  }

  public setCameraPose({ position, quaternion, up }: { position: number[]; quaternion: number[]; up: number[] }) {
    this.worker.postMessage({ type: 'setCameraPose', position, quaternion, up });
  }

  public loadAssemblyJson(url: string) {
    this.worker.postMessage({
      type: 'loadAssemblyJson',
      url: url,
    });
  }
}
