import { ThreeApp } from '@/threeApp/threeApp';
import { SvgApp } from '@/svgApp/svgApp';
import { UiMain } from '@/ui/uiMain';

export const threeApp = new ThreeApp();
const svgApp = new SvgApp();
const uiMain = new UiMain();

threeApp.init();
svgApp.init();
uiMain.init();
