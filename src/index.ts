import { ThreeApp } from '@/threeApp/ThreeApp';
import { SvgApp } from '@/svgApp/SvgApp';
import { UiMain } from '@/ui/UiMain';
import { AssemblyJsonLoader } from '@/core/AssemblyJsonLoader';
import { OffscreenCanvasManager } from './threeApp/worker/OffscreenCanvasManager';

export interface Viewer3DOptions {
  container: HTMLElement;
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
  const { container, useWorker = true } = options;

  // Инициализируем ThreeApp
  const threeApp = ThreeApp.inst();
  threeApp.isWorker = useWorker;
  await threeApp.init(container);

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
