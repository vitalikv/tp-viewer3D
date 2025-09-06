import { SceneManager } from './core/sceneManager';
import { ModelFileLoader } from './loaders/modelFileLoader';
import { ModelLoader } from './loaders/modelLoader';
import { MouseManager } from './mouse/mouseManager';
import { BVHManager } from './bvh/bvhManager';

import { ModelFileLoader2 } from './loaders/workers/modelFileLoader2';
import { RenderWorker } from './render/initRenderWorker';

class ThreeApp {
  sceneManager: SceneManager;
  modelFileLoader: ModelFileLoader;
  modelLoader: ModelLoader;
  mouseManager: MouseManager;
  bvhManager: BVHManager;
  renderWorker: RenderWorker;

  constructor() {
    let isRenderWorker = true;

    const elContainer = document.getElementById('container');
    const rect = elContainer.getBoundingClientRect();

    if (isRenderWorker) {
      new ModelFileLoader2();
      this.renderWorker = new RenderWorker({ container: elContainer });
    } else {
      this.sceneManager = new SceneManager();
      this.sceneManager.init({ width: rect.width, height: rect.height });
      this.modelFileLoader = new ModelFileLoader();
      this.modelLoader = new ModelLoader();
      this.mouseManager = new MouseManager();
      this.bvhManager = new BVHManager();

      this.mouseManager.init(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer.domElement);

      // this.modelLoader.setMerge({ merge: false });
      //this.bvhManager.init();
    }
  }
}

export const threeApp = new ThreeApp();
