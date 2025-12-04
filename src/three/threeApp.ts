import { SceneManager } from './scene/sceneManager';
import { ModelFileLoader } from './loaders/modelFileLoader';
import { ModelLoader } from './model/modelLoader';
import { MouseManager } from './scene/mouseManager';
import { SelectionHandler } from './selection/selectionHandler';
import { BVHManager } from './bvh/bvhManager';
import { ClippingBvh } from './clipping/clippingBvh';
import { EffectsManager } from './scene/effectsManager';
import { OutlineSelection } from './selection/outlineSelection';
import { WatermarkCanvas, IWatermarkParams } from '../watermark/watermarkCanvas';
import { AnimationManager } from './animation/animationManager';

import { ViewCube } from './scene/viewCube';

import { ModelFileLoader2 } from './loaders/workers/modelFileLoader2';
import { RenderWorker } from './render/initRenderWorker';

class ThreeApp {
  modelFileLoader: ModelFileLoader;
  renderWorker: RenderWorker;

  constructor() {}

  async init() {
    let isRenderWorker = false;

    const container = document.getElementById('container');

    await this.initWatermark();

    if (isRenderWorker) {
      new ModelFileLoader2();
      this.renderWorker = new RenderWorker({ container });
    } else {
      await SceneManager.inst().init({ container });
      this.modelFileLoader = new ModelFileLoader();
      ModelLoader.inst();
      SelectionHandler.inst();
      MouseManager.inst();
      OutlineSelection.inst();
      BVHManager.inst();
      ClippingBvh.inst();
      AnimationManager.inst();

      EffectsManager.inst().init({ scene: SceneManager.inst().scene, camera: SceneManager.inst().camera, renderer: SceneManager.inst().renderer, container });
      OutlineSelection.inst().init({ outlinePass: EffectsManager.inst().outlinePass, composer: EffectsManager.inst().composer });
      MouseManager.inst().init(SceneManager.inst().camera, SceneManager.inst().renderer.domElement);
      BVHManager.inst().init();

      new ViewCube({ container, controls: SceneManager.inst().controls, animate: () => SceneManager.inst().render() });

      ModelLoader.inst().setMerge({ merge: true });
    }
  }

  private initWatermark() {
    const params: IWatermarkParams = {
      activated: false, // вкл/выкл watermark
      contentType: 'datetime', // 'datetime' | 'text' показывать время или текст
      text: '', // если указанно в contentType: 'text', то можно задать свой текст
      textColor: '#000000', // цвет текста
      opacityText: 0.7, // прозрачность текста
      opacityLogo: 0.3, // прозрачность логотипа
      fontSize: 16, // размер текста
      width: 150,
      height: 100,
      urlLogo: './assets/watermark/application.svg', // ссылка на логотип
      //urlLogo: 'https://static.tildacdn.com/tild6339-3233-4234-a137-643165663664/logo_rosatom.png',
      scaleLogo: 2, // насколько увеличить логотип (масштаб)
      padding: 0,
      spacing: 100, // отступы логотипов друг от друга
    };

    WatermarkCanvas.setParams(params);
  }
}

export const threeApp = new ThreeApp();
threeApp.init();
