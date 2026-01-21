import { ThreeApp } from '@/threeApp/ThreeApp';
import { SvgApp } from '@/svgApp/SvgApp';
import { UiMain } from '@/ui/UiMain';

const threeApp = ThreeApp.inst();
const svgApp = SvgApp.inst();
const uiMain = UiMain.inst();

threeApp.init({ autoLoadModelUrl: '/public/assets/ТРР-1-000 - Транспортер - A.1 (1).gltf' });
svgApp.init();
uiMain.init();
