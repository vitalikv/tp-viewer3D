import { ThreeApp } from '@/threeApp/threeApp';
import { SvgApp } from '@/svgApp/svgApp';
import { UiMain } from '@/ui/uiMain';

const threeApp = ThreeApp.inst();
const svgApp = SvgApp.inst();
const uiMain = UiMain.inst();

threeApp.init();
svgApp.init();
uiMain.init();
