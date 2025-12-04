import { SceneManager } from '@/three/scene/sceneManager';
import { ModelLoader } from '@/three/model/modelLoader';
import { MouseManager } from '@/three/scene/mouseManager';
import { SelectionHandler } from '@/three/selection/selectionHandler';
import { BVHManager } from '@/three/bvh/bvhManager';
import { ClippingBvh } from '@/three/clipping/clippingBvh';
import { EffectsManager } from '@/three/scene/effectsManager';
import { OutlineSelection } from '@/three/selection/outlineSelection';
import { WatermarkCanvas, IWatermarkParams } from '@/watermark/watermarkCanvas';
import { AnimationManager } from '@/three/animation/animationManager';

import { ViewCube } from '@/three/scene/viewCube';

import { ModelFileLoader2 } from '@/three/loaders/workers/modelFileLoader2';
import { RenderWorker } from '@/three/render/initRenderWorker';

export class ThreeApp {
  renderWorker: RenderWorker;

  constructor() {}

  async init() {
    let isRenderWorker = false;

    const container = document.getElementById('container');

    this.initWatermark();

    if (isRenderWorker) {
      new ModelFileLoader2();
      this.renderWorker = new RenderWorker({ container });
    } else {
      await SceneManager.inst().init({ container });
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
