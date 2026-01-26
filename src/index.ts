import { ThreeApp } from '@/threeApp/ThreeApp';
import { SvgApp } from '@/svgApp/SvgApp';
import { UiMain } from '@/ui/UiMain';
import { AssemblyJsonLoader } from '@/core/AssemblyJsonLoader';
import { OffscreenCanvasManager } from './threeApp/worker/OffscreenCanvasManager';

export interface Viewer3DOptions {
  canvas: HTMLCanvasElement;
  container?: HTMLElement;
  useWorker?: boolean;
}

export interface Viewer3DInstance {
  loadModel: (
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ) => Promise<boolean>;
  loadSvg: (
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ) => Promise<boolean>;
  loadAssemblyJson: (
    url: string,
    callbacks?: {
      onProgress?: (percent: number) => void;
      onLoaded?: (url: string) => void;
      onError?: (error: string) => void;
    }
  ) => Promise<boolean>;
  setAssemblyJson: (jsonData: unknown) => void;
  dispose: () => void;
}

export async function TFlexViewer(options: Viewer3DOptions): Promise<Viewer3DInstance> {
  const { canvas, container, useWorker = true } = options;

  // Устанавливаем контейнер, если не передан
  let containerElement = container;
  if (!containerElement) {
    containerElement = document.body.querySelector('#container') as HTMLDivElement;
    if (!containerElement) {
      containerElement = document.createElement('div');
      containerElement.id = 'container';
      containerElement.style.position = 'relative';
      containerElement.style.width = '100%';
      containerElement.style.height = '100%';
      canvas.parentElement?.appendChild(containerElement);
    }
  }

  // Убеждаемся, что canvas находится в контейнере и имеет правильный id
  if (canvas.id !== 'canvas') {
    canvas.id = 'canvas';
  }
  if (canvas.parentElement !== containerElement) {
    containerElement.appendChild(canvas);
  }

  // Инициализируем ThreeApp
  const threeApp = ThreeApp.inst();
  threeApp.isWorker = useWorker;
  await threeApp.init();

  // Инициализируем SvgApp
  const svgApp = SvgApp.inst();
  await svgApp.init();

  // Инициализируем UiMain
  const uiMain = UiMain.inst();
  uiMain.init();

  // Возвращаем API для управления
  return {
    loadModel: (url: string, callbacks?) => threeApp.loadModel(url, callbacks),
    loadSvg: (url: string, callbacks?) => svgApp.loadSvg(url, callbacks),
    loadAssemblyJson: (url: string, callbacks?) => AssemblyJsonLoader.inst().loadFromUrl(url, callbacks),
    setAssemblyJson: (jsonData: unknown) => AssemblyJsonLoader.inst().setJson(jsonData),
    dispose: () => {
      if (useWorker) {
        OffscreenCanvasManager.inst().dispose();
      }
    },
  };
}

// Экспортируем основные классы для расширенного использования
export { ThreeApp } from '@/threeApp/ThreeApp';
export { SvgApp } from '@/svgApp/SvgApp';
export { UiMain } from '@/ui/UiMain';
export { AssemblyJsonLoader } from '@/core/AssemblyJsonLoader';
export { ContextSingleton } from '@/core/ContextSingleton';
