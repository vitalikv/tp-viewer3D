import { SceneManager } from './core/sceneManager';
import { ModelFileLoader } from './loaders/modelFileLoader';
import { ModelLoader } from './loaders/modelLoader';
import { MouseManager } from './mouse/mouseManager';
import { BVHManager } from './bvh/bvhManager';
import { EffectsManager } from './core/effectsManager';
import { OutlineSelection } from './mouse/outlineSelection';

import { ModelFileLoader2 } from './loaders/workers/modelFileLoader2';
import { RenderWorker } from './render/initRenderWorker';

class ThreeApp {
  sceneManager: SceneManager;
  modelFileLoader: ModelFileLoader;
  modelLoader: ModelLoader;
  mouseManager: MouseManager;
  outlineSelection: OutlineSelection;
  bvhManager: BVHManager;
  renderWorker: RenderWorker;
  effectsManager: EffectsManager;

  constructor() {}

  init() {
    let isRenderWorker = false;

    const container = document.getElementById('container');

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

      // this.effectsManager = new EffectsManager();
      // this.effectsManager.init({ scene: this.sceneManager.scene, camera: this.sceneManager.camera, renderer: this.sceneManager.renderer, container });
      // this.outlineSelection.init({ outlinePass: this.effectsManager.outlinePass, composer: this.effectsManager.composer });
      this.mouseManager.init(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer.domElement);

      this.modelLoader.setMerge({ merge: true });
      this.bvhManager.init();
    }
  }
}

export const threeApp = new ThreeApp();
threeApp.init();
