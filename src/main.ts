import { TFlexViewer } from '@/index';

(async () => {
  const container = document.createElement('div');
  container.id = 'container';
  container.style.position = 'relative';
  container.style.width = '100%';
  container.style.height = '100vh';
  document.body.appendChild(container);

  const statsContainer = document.createElement('div');
  statsContainer.id = 'stats';
  document.body.appendChild(statsContainer);

  const viewer = await TFlexViewer({
    container,
    useWorker: true,
  });

  await viewer.loadAssemblyJson('/public/assets/ТРР-1-000 - Транспортер - A.1 (5).json');
  await viewer.loadModel('/public/assets/ТРР-1-000 - Транспортер - A.1 (1).gltf');
  // await viewer.loadSvg('/public/assets/svg/ТРР-1-000 - Транспортер - A.1 - Взрыв-схема.svg');
  //await viewer.loadSvg('/public/assets/svg/ТРР-1-021 Блок роликов СБ.svg');
})();
