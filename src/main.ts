import { ThreeApp } from '@/threeApp/ThreeApp';
import { SvgApp } from '@/svgApp/SvgApp';
import { UiMain } from '@/ui/UiMain';

const threeApp = ThreeApp.inst();
const svgApp = SvgApp.inst();
const uiMain = UiMain.inst();

threeApp.init();
svgApp.init();
uiMain.init();
