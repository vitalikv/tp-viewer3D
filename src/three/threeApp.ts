import { SceneManager } from './core/sceneManager';
import { ModelFileLoader } from './loaders/modelFileLoader';
import { ModelLoader } from './model/modelLoader';
import { MouseManager } from './mouse/mouseManager';
import { BVHManager } from './bvh/bvhManager';
import { ClippingBvh } from './clipping/clippingBvh';
import { EffectsManager } from './core/effectsManager';
import { OutlineSelection } from './mouse/outlineSelection';
import { WatermarkCanvas, IWatermarkParams } from '../watermark/watermarkCanvas';
import { AnimationManager } from './animation/animationManager';

import { ModelFileLoader2 } from './loaders/workers/modelFileLoader2';
import { RenderWorker } from './render/initRenderWorker';

class ThreeApp {
  sceneManager: SceneManager;
  modelFileLoader: ModelFileLoader;
  modelLoader: ModelLoader;
  mouseManager: MouseManager;
  outlineSelection: OutlineSelection;
  bvhManager: BVHManager;
  clippingBvh: ClippingBvh;
  renderWorker: RenderWorker;
  effectsManager: EffectsManager;
  animationManager: AnimationManager;

  constructor() {}

  async init() {
    let isRenderWorker = false;

    const container = document.getElementById('container');

    await this.initWatermark();

    if (isRenderWorker) {
      new ModelFileLoader2();
      this.renderWorker = new RenderWorker({ container });
    } else {
      this.sceneManager = new SceneManager();
      this.sceneManager.init({ container });
      this.modelFileLoader = new ModelFileLoader();
      this.modelLoader = new ModelLoader();
      this.mouseManager = new MouseManager();
      this.outlineSelection = new OutlineSelection();
      this.bvhManager = new BVHManager();
      this.clippingBvh = new ClippingBvh();
      this.animationManager = new AnimationManager();

      this.effectsManager = new EffectsManager();
      this.effectsManager.init({ scene: this.sceneManager.scene, camera: this.sceneManager.camera, renderer: this.sceneManager.renderer, container });
      this.outlineSelection.init({ outlinePass: this.effectsManager.outlinePass, composer: this.effectsManager.composer });
      this.mouseManager.init(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer.domElement);
      this.bvhManager.init();

      this.modelLoader.setMerge({ merge: false });
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
