import { TFlexViewer } from '@/index';

(async () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const container = document.getElementById('container') as HTMLElement;

  const viewer = await TFlexViewer({
    canvas,
    container,
    useWorker: true,
  });

  await viewer.loadAssemblyJson('/public/assets/ТРР-1-000 - Транспортер - A.1 (5).json');
  await viewer.loadModel('/public/assets/ТРР-1-000 - Транспортер - A.1 (1).gltf');
  await viewer.loadSvg('/public/assets/svg/ТРР-1-000 - Транспортер - A.1 - Взрыв-схема.svg');
  await viewer.loadSvg('/public/assets/svg/ТРР-1-021 Блок роликов СБ.svg');
})();
