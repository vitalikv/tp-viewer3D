import { ThreeApp } from '@/threeApp/ThreeApp';
import { SvgApp } from '@/svgApp/SvgApp';
import { UiMain } from '@/ui/UiMain';
import { AssemblyJsonLoader } from '@/core/AssemblyJsonLoader';

const threeApp = ThreeApp.inst();
const svgApp = SvgApp.inst();
const uiMain = UiMain.inst();

(async () => {
  await threeApp.init();
  await svgApp.init();
  uiMain.init();

  await AssemblyJsonLoader.inst().loadFromUrl('/public/assets/ТРР-1-000 - Транспортер - A.1 (5).json');

  await threeApp.loadModel('/public/assets/ТРР-1-000 - Транспортер - A.1 (1).gltf');
  await svgApp.loadSvg('/public/assets/svg/ТРР-1-000 - Транспортер - A.1 - Взрыв-схема.svg');
  await svgApp.loadSvg('/public/assets/svg/ТРР-1-021 Блок роликов СБ.svg');
})();
